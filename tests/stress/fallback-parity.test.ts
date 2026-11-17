import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServerInstance } from '../helpers/serverHelper.ts';

test('Adversarial In-Memory Fallback Parity: Full system operation under FOODLINK_DISABLE_PLACES_DB=1', async () => {
  let server: TestServerInstance | null = null;
  try {
    // Explicitly run with useMemory: true (FOODLINK_DISABLE_PLACES_DB=1)
    server = await startTestServer({ useMemory: true });
    const baseUrl = server.baseUrl;

    const timestamp = Date.now();
    const merchantEmail = `parity_merchant_${timestamp}@test.foodlink.local`;
    const customerEmail = `parity_customer_${timestamp}@test.foodlink.local`;

    // 1. Auth Registration & Verification in Memory Mode
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Maria Fallback',
        email: customerEmail,
        password: 'Password123!'
      })
    });
    assert.ok(regRes.status === 200 || regRes.status === 201);
    const regData = await regRes.json();
    assert.strictEqual(regData.success, true);
    const vCode = regData.verificationCode;
    assert.ok(vCode, 'Memory mode registration must supply verificationCode');

    // Verification
    const verifyRes = await fetch(`${baseUrl}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: customerEmail,
        code: vCode
      })
    });
    assert.strictEqual(verifyRes.status, 200);
    const verifyData = await verifyRes.json();
    assert.strictEqual(verifyData.user?.is_verified, true);

    // 2. Profile Preferences Persistence & Retrieval
    const profileSaveRes = await fetch(`${baseUrl}/api/places/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_email: customerEmail,
        pickup_alias: 'Maria Rapida',
        role: 'ambos',
        zone_note: 'Condesa, CDMX',
        dietary_tags: ['vegetariano', 'organico'],
        notify_favorites: true
      })
    });
    assert.strictEqual(profileSaveRes.status, 200);
    const profileSaveData = await profileSaveRes.json();
    assert.strictEqual(profileSaveData.success, true);

    const profileGetRes = await fetch(
      `${baseUrl}/api/places/profile?email=${encodeURIComponent(customerEmail)}`
    );
    assert.strictEqual(profileGetRes.status, 200);
    const profileGetData = await profileGetRes.json();
    assert.strictEqual(profileGetData.profile?.pickup_alias, 'Maria Rapida');
    assert.strictEqual(profileGetData.profile?.role, 'ambos');
    assert.strictEqual(profileGetData.profile?.zone_note, 'Condesa, CDMX');
    assert.deepStrictEqual(profileGetData.profile?.dietary_tags, ['vegetariano', 'organico']);
    assert.strictEqual(profileGetData.profile?.notify_favorites, true);

    // 3. Merchant Business Registration in Memory Mode
    const bizRegRes = await fetch(`${baseUrl}/api/places/business`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Fonda de Paridad',
        type: 'fonda',
        address: 'Calle Amsterdam 100, Condesa',
        phone: '5500112233',
        lat: 19.412,
        lng: -99.169,
        owner_email: merchantEmail
      })
    });
    assert.strictEqual(bizRegRes.status, 201);
    const bizRegData = await bizRegRes.json();
    const businessId = bizRegData.business?.id;
    assert.ok(businessId);

    // 4. Merchant Business Panel Inspection
    const panelRes = await fetch(
      `${baseUrl}/api/places/business/panel?email=${encodeURIComponent(merchantEmail)}`
    );
    assert.strictEqual(panelRes.status, 200);
    const panelData = await panelRes.json();
    assert.strictEqual(panelData.success, true);
    assert.strictEqual(panelData.business?.id, businessId);
    assert.strictEqual(panelData.available_businesses.length, 1);
    assert.strictEqual(panelData.available_businesses[0].id, businessId);

    // 5. Multiple Offers Publication
    const offerIds: number[] = [];
    for (let i = 1; i <= 3; i++) {
      const offerRes = await fetch(`${baseUrl}/api/places/business/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          email: merchantEmail,
          title: `Platillo Paridad #${i}`,
          originalPrice: 120,
          price: 60,
          quantity: 5,
          pickupHours: 4
        })
      });
      assert.strictEqual(offerRes.status, 201);
      const offerData = await offerRes.json();
      offerIds.push(offerData.offer.id);
    }
    assert.strictEqual(offerIds.length, 3);

    // 6. Multiple Customer Reservations
    const pickupCodes: string[] = [];
    for (const offId of offerIds) {
      const orderRes = await fetch(`${baseUrl}/api/places/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: customerEmail,
          userName: 'Maria Fallback',
          offerId: offId,
          quantity: 1
        })
      });
      assert.ok(
        orderRes.status === 200 || orderRes.status === 201,
        `Order reservation must succeed with 200 or 201 (got ${orderRes.status})`
      );
      const orderData = await orderRes.json();
      pickupCodes.push(orderData.order.pickup_code);
    }
    assert.strictEqual(pickupCodes.length, 3);

    // 7. Verify All Distinct Pickup Codes
    const distinctCodes = new Set(pickupCodes);
    assert.strictEqual(distinctCodes.size, 3, 'All pickup codes must be unique');

    // 8. Sequential Redemptions in Memory Mode
    for (const code of pickupCodes) {
      const redeemRes = await fetch(`${baseUrl}/api/places/business/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_code: code,
          businessId
        })
      });
      assert.strictEqual(redeemRes.status, 200, `Redeeming ${code} must succeed with 200`);
      const redeemData = await redeemRes.json();
      assert.strictEqual(redeemData.order?.status, 'picked_up');
    }

    // 9. Business Panel Order History Verification
    const updatedPanelRes = await fetch(
      `${baseUrl}/api/places/business/panel?email=${encodeURIComponent(merchantEmail)}`
    );
    const updatedPanelData = await updatedPanelRes.json();
    assert.strictEqual(updatedPanelData.orders?.pending.length, 0, 'No pending orders should remain');
    assert.ok(
      updatedPanelData.orders?.history.length >= 3,
      'History must contain at least 3 completed orders'
    );

    // 10. Favorites Toggle & Distant Visibility in Memory Mode
    const favRes = await fetch(`${baseUrl}/api/places/favorites/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId,
        email: customerEmail
      })
    });
    assert.strictEqual(favRes.status, 200);
    assert.strictEqual((await favRes.json()).is_favorite, true);

    const nearbyRes = await fetch(
      `${baseUrl}/api/places/nearby?email=${encodeURIComponent(customerEmail)}&lat=19.4326&lng=-99.1332`
    );
    assert.strictEqual(nearbyRes.status, 200);
    const nearbyData = await nearbyRes.json();
    assert.ok(nearbyData.favorite_ids.includes(businessId));
  } finally {
    if (server) await server.stop();
  }
});
