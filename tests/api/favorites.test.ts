import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServerInstance } from '../helpers/serverHelper.ts';

for (const mode of ['memory', 'sql'] as const) {
  test(`Favorites API [${mode} mode]: Favorites located >10km remain visible with active rescue alerts`, async () => {
    let server: TestServerInstance | null = null;
    try {
      server = await startTestServer({ useMemory: mode === 'memory' });
      const baseUrl = server.baseUrl;

      const userEmail = `fav_user_${mode}_${Date.now()}@test.foodlink.local`;
      const merchantEmail = `fav_merch_${mode}_${Date.now()}@test.foodlink.local`;

      // CDMX Center: 19.4326, -99.1332
      // 15 km North: lat += 15000 / 111320 ~= +0.1348 degrees -> 19.5674
      const centerLat = 19.4326;
      const centerLng = -99.1332;
      const farLat = 19.5674;
      const farLng = -99.1332;

      // 1. Register a distant business (>10 km away)
      const regBizRes = await fetch(`${baseUrl}/api/places/business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Restaurante Vallejo Norte (>10km)',
          type: 'restaurante',
          address: 'Calzada Vallejo 1500, Gustavo A Madero',
          phone: '5544332211',
          lat: farLat,
          lng: farLng,
          owner_email: merchantEmail
        })
      });
      assert.ok(
        regBizRes.status === 200 || regBizRes.status === 201,
        `Distant business registration must succeed (got ${regBizRes.status})`
      );
      const regBizData = await regBizRes.json();
      const farBizId = regBizData.business?.id;
      assert.ok(farBizId, 'Distant business must have valid id');

      // 2. Publish an active surplus offer for the distant business
      const offerRes = await fetch(`${baseUrl}/api/places/business/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: farBizId,
          email: merchantEmail,
          title: 'Paquete Rescate Vallejo',
          originalPrice: 160,
          price: 80,
          quantity: 4,
          pickupHours: 4
        })
      });
      assert.ok(
        offerRes.status === 200 || offerRes.status === 201,
        `Offer creation must succeed (got ${offerRes.status})`
      );

      // 3. User favorites the distant business
      const favToggleRes = await fetch(`${baseUrl}/api/places/favorites/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: farBizId,
          email: userEmail
        })
      });
      assert.strictEqual(favToggleRes.status, 200, 'Favorite toggle must succeed');
      const favToggleData = await favToggleRes.json();
      assert.strictEqual(favToggleData.is_favorite, true, 'is_favorite must be true after toggle');

      // 4. Query nearby places from user center with 10 km (10,000m) radius
      const nearbyUrl = `${baseUrl}/api/places/nearby?email=${encodeURIComponent(userEmail)}&lat=${centerLat}&lng=${centerLng}&radius=10000`;
      const nearbyRes = await fetch(nearbyUrl);
      assert.strictEqual(nearbyRes.status, 200, 'Nearby query must succeed');
      const nearbyData = await nearbyRes.json();

      // Verification A: favorite_ids must include the distant place
      assert.ok(Array.isArray(nearbyData.favorite_ids), 'favorite_ids must be an array');
      assert.ok(
        nearbyData.favorite_ids.includes(farBizId),
        `favorite_ids must include distant place id ${farBizId} (>10km away)`
      );

      // Verification B: active_favorite_alerts must include the distant place alert
      assert.ok(Array.isArray(nearbyData.active_favorite_alerts), 'active_favorite_alerts must be an array');
      const farAlert = nearbyData.active_favorite_alerts.find((a: any) => Number(a.id) === Number(farBizId));
      assert.ok(
        farAlert,
        `active_favorite_alerts must contain alert for favorited business ${farBizId} (>10km away)`
      );
      assert.ok(farAlert.offers_count >= 1, 'Far favorite alert must report at least 1 active offer');

      // 5. Test unfavoriting
      const unfavRes = await fetch(`${baseUrl}/api/places/favorites/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: farBizId,
          email: userEmail
        })
      });
      const unfavData = await unfavRes.json();
      assert.strictEqual(unfavData.is_favorite, false, 'is_favorite must be false after un-toggling');

      // Confirm removed from favorite_ids
      const nearbyAfterRes = await fetch(nearbyUrl);
      const nearbyAfterData = await nearbyAfterRes.json();
      assert.strictEqual(
        nearbyAfterData.favorite_ids.includes(farBizId),
        false,
        'Distant place must no longer be in favorite_ids'
      );
    } finally {
      if (server) await server.stop();
    }
  });
}
