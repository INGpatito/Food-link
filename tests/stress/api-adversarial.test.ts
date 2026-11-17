import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServerInstance } from '../helpers/serverHelper.ts';

for (const mode of ['memory', 'sql'] as const) {
  test(`Adversarial API Stress [${mode} mode]: Backend offer authorization rejection (spoofed emails, invalid IDs, bad prices)`, async () => {
    let server: TestServerInstance | null = null;
    try {
      server = await startTestServer({ useMemory: mode === 'memory' });
      const baseUrl = server.baseUrl;

      const legitimateOwner = `legit_owner_${mode}_${Date.now()}@test.foodlink.local`;
      const attackerEmail = `attacker_spoof_${mode}_${Date.now()}@test.foodlink.local`;

      // 1. Register Business for legitimate owner
      const regBizRes = await fetch(`${baseUrl}/api/places/business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Restaurante Autentico',
          type: 'restaurante',
          address: 'Av Chapultepec 200, Roma',
          phone: '5566778899',
          lat: 19.421,
          lng: -99.163,
          owner_email: legitimateOwner
        })
      });
      assert.ok(regBizRes.status === 200 || regBizRes.status === 201);
      const regBizData = await regBizRes.json();
      const bizId = regBizData.business?.id;
      assert.ok(bizId, 'Business must have valid id');

      // 2. Attack: Create offer with spoofed email (attacker attempts to publish on legitimate business)
      const spoofOfferRes = await fetch(`${baseUrl}/api/places/business/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: bizId,
          email: attackerEmail,
          title: 'Oferta Maliciosa',
          originalPrice: 100,
          price: 50,
          quantity: 2,
          pickupHours: 2
        })
      });
      assert.strictEqual(
        spoofOfferRes.status,
        403,
        'Offer creation by non-owner must be rejected with HTTP 403 Forbidden'
      );
      const spoofOfferData = await spoofOfferRes.json();
      assert.strictEqual(spoofOfferData.success, false);

      // 3. Attack: Create offer with missing email
      const noEmailOfferRes = await fetch(`${baseUrl}/api/places/business/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: bizId,
          title: 'Oferta Sin Correo',
          originalPrice: 100,
          price: 50,
          quantity: 2
        })
      });
      assert.strictEqual(
        noEmailOfferRes.status,
        403,
        'Offer creation with missing email must return HTTP 403 Forbidden'
      );

      // 4. Attack: Create offer with invalid business ID (0, negative, string, nonexistent)
      const invalidBizIds = [0, -1, 'invalid', 999999];
      for (const badId of invalidBizIds) {
        const badIdRes = await fetch(`${baseUrl}/api/places/business/offers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: badId,
            email: legitimateOwner,
            title: 'Oferta ID Invalido',
            originalPrice: 100,
            price: 50,
            quantity: 2
          })
        });
        assert.ok(
          badIdRes.status === 400 || badIdRes.status === 404,
          `Invalid businessId ${badId} must return 400 or 404 (got ${badIdRes.status})`
        );
      }

      // 5. Attack: Create offer with price > original_price (excessive prices)
      const excessivePriceCases = [
        { orig: 100, price: 101 },
        { orig: 50, price: 150 },
        { orig: 0, price: 20 },
        { orig: 10, price: 10.01 }
      ];
      for (const tc of excessivePriceCases) {
        const excessPriceRes = await fetch(`${baseUrl}/api/places/business/offers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: bizId,
            email: legitimateOwner,
            title: 'Oferta Precio Excesivo',
            originalPrice: tc.orig,
            price: tc.price,
            quantity: 3
          })
        });
        assert.strictEqual(
          excessPriceRes.status,
          400,
          `Offer with price (${tc.price}) > original_price (${tc.orig}) must be rejected with 400`
        );
        const excessData = await excessPriceRes.json();
        assert.strictEqual(excessData.success, false);
        assert.ok(
          excessData.message.includes('precio') || excessData.message.includes('mayor'),
          'Error message must indicate price cannot exceed original price'
        );
      }

      // 6. Attack: Create offer with invalid title
      const badTitleRes = await fetch(`${baseUrl}/api/places/business/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: bizId,
          email: legitimateOwner,
          title: 'x', // less than 3 chars
          originalPrice: 100,
          price: 50
        })
      });
      assert.strictEqual(badTitleRes.status, 400, 'Title < 3 chars must return status 400');

      // 7. Legitimate offer creation succeeds
      const legitOfferRes = await fetch(`${baseUrl}/api/places/business/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: bizId,
          email: legitimateOwner,
          title: 'Paquete Cena Sorpresa',
          originalPrice: 160,
          price: 80,
          quantity: 4,
          pickupHours: 3
        })
      });
      assert.strictEqual(legitOfferRes.status, 201, 'Legitimate offer creation must return 201');
      const legitOfferData = await legitOfferRes.json();
      const offerId = legitOfferData.offer?.id;
      assert.ok(offerId, 'Created offer must have valid id');

      // 8. Attack: Close offer with spoofed email
      const spoofCloseRes = await fetch(
        `${baseUrl}/api/places/business/offers/${offerId}/close`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: attackerEmail })
        }
      );
      assert.strictEqual(
        spoofCloseRes.status,
        403,
        'Offer closure by non-owner must be rejected with HTTP 403 Forbidden'
      );

      // 9. Attack: Close offer with missing email
      const noEmailCloseRes = await fetch(
        `${baseUrl}/api/places/business/offers/${offerId}/close`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        }
      );
      assert.strictEqual(
        noEmailCloseRes.status,
        403,
        'Offer closure with missing email must return HTTP 403 Forbidden'
      );

      // 10. Attack: Close offer with invalid offer ID
      const invalidOfferIds = [0, -1, 999999];
      for (const badOfferId of invalidOfferIds) {
        const badCloseRes = await fetch(
          `${baseUrl}/api/places/business/offers/${badOfferId}/close`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: legitimateOwner })
          }
        );
        assert.ok(
          badCloseRes.status === 400 || badCloseRes.status === 404,
          `Invalid offer ID ${badOfferId} must return 400 or 404 (got ${badCloseRes.status})`
        );
      }

      // 11. Legitimate owner closes offer
      const legitCloseRes = await fetch(
        `${baseUrl}/api/places/business/offers/${offerId}/close`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: legitimateOwner })
        }
      );
      assert.strictEqual(legitCloseRes.status, 200, 'Legitimate owner closing offer must return 200');
    } finally {
      if (server) await server.stop();
    }
  });

  test(`Adversarial API Stress [${mode} mode]: QR redemption cross-store rejection and boundary testing`, async () => {
    let server: TestServerInstance | null = null;
    try {
      server = await startTestServer({ useMemory: mode === 'memory' });
      const baseUrl = server.baseUrl;

      const merchantA = `merch_red_a_${mode}_${Date.now()}@test.foodlink.local`;
      const merchantB = `merch_red_b_${mode}_${Date.now()}@test.foodlink.local`;
      const customer = `client_red_${mode}_${Date.now()}@test.foodlink.local`;

      // 1. Register Store A
      const regARes = await fetch(`${baseUrl}/api/places/business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Panaderia Francesa A',
          type: 'panaderia',
          address: 'Calle Durango 100, Roma',
          phone: '5512345678',
          lat: 19.419,
          lng: -99.165,
          owner_email: merchantA
        })
      });
      const bizA = (await regARes.json()).business;
      assert.ok(bizA?.id);

      // 2. Register Store B
      const regBRes = await fetch(`${baseUrl}/api/places/business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Cafeteria Especialidad B',
          type: 'cafeteria',
          address: 'Calle Zacatecas 80, Roma',
          phone: '5587654321',
          lat: 19.416,
          lng: -99.161,
          owner_email: merchantB
        })
      });
      const bizB = (await regBRes.json()).business;
      assert.ok(bizB?.id);

      // 3. Store A publishes an offer
      const offerARes = await fetch(`${baseUrl}/api/places/business/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: bizA.id,
          email: merchantA,
          title: 'Croissant y Baguette',
          originalPrice: 150,
          price: 75,
          quantity: 3,
          pickupHours: 4
        })
      });
      const offerA = (await offerARes.json()).offer;
      assert.ok(offerA?.id);

      // 4. Customer reserves the offer from Store A
      const reserveRes = await fetch(`${baseUrl}/api/places/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: customer,
          userName: 'Valeria Cliente',
          offerId: offerA.id,
          quantity: 1
        })
      });
      assert.ok(reserveRes.status === 200 || reserveRes.status === 201);
      const reserveData = await reserveRes.json();
      const pickupCode = reserveData.order?.pickup_code;
      const orderId = reserveData.order?.id;
      assert.ok(pickupCode, 'Reservation must return pickup_code');
      assert.ok(orderId, 'Reservation must return order id');

      const redeemUrl = `${baseUrl}/api/places/business/redeem`;

      // 5. ATTACK: Cross-store redemption
      // Store B attempts to redeem pickup code belonging to Store A
      const crossStoreRes = await fetch(redeemUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_code: pickupCode,
          businessId: bizB.id // WRONG STORE
        })
      });

      assert.strictEqual(
        crossStoreRes.status,
        400,
        'Cross-store redemption must be rejected with HTTP 400'
      );
      const crossStoreData = await crossStoreRes.json();
      assert.strictEqual(crossStoreData.success, false);
      assert.strictEqual(
        crossStoreData.message,
        'El codigo de recogida pertenece a otro establecimiento y no puede canjearse aqui.',
        'Must return the exact required error message for cross-store redemption'
      );

      // 6. Cross-store redemption with "FOODLINK:" prefix included
      const crossStoreWithPrefixRes = await fetch(redeemUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_code: `FOODLINK:${pickupCode}`,
          businessId: bizB.id
        })
      });
      assert.strictEqual(crossStoreWithPrefixRes.status, 400);
      const crossStoreWithPrefixData = await crossStoreWithPrefixRes.json();
      assert.strictEqual(
        crossStoreWithPrefixData.message,
        'El codigo de recogida pertenece a otro establecimiento y no puede canjearse aqui.'
      );

      // 7. Boundary: Nonexistent pickup code
      const nonexistentRes = await fetch(redeemUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_code: 'FL-NONEXIST99',
          businessId: bizA.id
        })
      });
      assert.strictEqual(nonexistentRes.status, 404, 'Nonexistent pickup code must return 404');

      // 8. Boundary: Empty pickup code
      const emptyCodeRes = await fetch(redeemUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_code: '',
          businessId: bizA.id
        })
      });
      assert.strictEqual(emptyCodeRes.status, 400, 'Empty pickup code must return 400');

      // 9. Boundary: Invalid or missing businessId
      const badBizRes = await fetch(redeemUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_code: pickupCode,
          businessId: 0
        })
      });
      assert.strictEqual(badBizRes.status, 400, 'Missing/zero businessId must return 400');

      // 10. Legitimate redemption by Store A (Correct business)
      const legitRedeemRes = await fetch(redeemUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_code: pickupCode,
          businessId: bizA.id
        })
      });
      assert.strictEqual(legitRedeemRes.status, 200, 'Legitimate redemption must return 200');
      const legitRedeemData = await legitRedeemRes.json();
      assert.strictEqual(legitRedeemData.success, true);
      assert.strictEqual(legitRedeemData.order?.status, 'picked_up');

      // 11. ATTACK: Double redemption / Replay attack
      const doubleRedeemRes = await fetch(redeemUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_code: pickupCode,
          businessId: bizA.id
        })
      });
      assert.strictEqual(
        doubleRedeemRes.status,
        400,
        'Duplicate redemption of already picked-up order must return 400'
      );
      const doubleData = await doubleRedeemRes.json();
      assert.strictEqual(doubleData.success, false);
      assert.ok(
        doubleData.message.includes('ya fue'),
        'Message must indicate order was already redeemed'
      );

      // 12. ATTACK: Redemption of cancelled order
      // Create another reservation and cancel it
      const reserve2Res = await fetch(`${baseUrl}/api/places/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: customer,
          userName: 'Valeria Cliente',
          offerId: offerA.id,
          quantity: 1
        })
      });
      const order2 = (await reserve2Res.json()).order;
      assert.ok(order2?.pickup_code);

      // Cancel order 2
      const cancelRes = await fetch(`${baseUrl}/api/places/orders/${order2.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: customer })
      });
      assert.strictEqual(cancelRes.status, 200, 'Cancellation must succeed with 200');

      // Attempt to redeem cancelled order
      const redeemCancelledRes = await fetch(redeemUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_code: order2.pickup_code,
          businessId: bizA.id
        })
      });
      assert.strictEqual(
        redeemCancelledRes.status,
        400,
        'Redeeming cancelled order must be rejected with 400'
      );
      const redeemCancelledData = await redeemCancelledRes.json();
      assert.strictEqual(redeemCancelledData.success, false);
      assert.ok(
        redeemCancelledData.message.includes('cancelada'),
        'Message must indicate reservation is cancelled'
      );
    } finally {
      if (server) await server.stop();
    }
  });
}
