import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderQrSvg,
  decodeQrSvg,
  generateQrMatrix,
  decodeQrMatrix,
  analyzeQrMatrix,
  verifyQrPayload,
  compareQrPayloads,
  isAlphanumeric,
  ALPHANUMERIC_CHARS,
  VERSIONS
} from '../../src/explorar/qr.ts';
import { startTestServer, type TestServerInstance } from '../helpers/serverHelper.ts';

// ----------------------------------------------------------------------------
// 1. QR ENGINE ADVERSARIAL STRESS TEST HARNESS (Lengths 1..55+ bytes)
// ----------------------------------------------------------------------------

test('Adversarial Stress [QR Engine]: Exhaustive length sweep 1..55 bytes in Alphanumeric mode', () => {
  for (let len = 1; len <= 55; len++) {
    // Generate payload of exact length using repeating alphanumeric pattern
    let payload = '';
    for (let i = 0; i < len; i++) {
      payload += ALPHANUMERIC_CHARS[i % ALPHANUMERIC_CHARS.length];
    }
    assert.strictEqual(payload.length, len, `Length must be ${len}`);
    assert.strictEqual(isAlphanumeric(payload), true, `Must be alphanumeric for len ${len}`);

    // Matrix generation
    const matrix = generateQrMatrix(payload);
    const size = matrix.length;

    // Check version sizing boundaries:
    // v1: len <= 25 -> size 21
    // v2: len 26..47 -> size 25
    // v3: len 48..77 -> size 29
    if (len <= 25) {
      assert.strictEqual(size, 21, `Len ${len} must map to Version 1 (21x21)`);
    } else if (len <= 47) {
      assert.strictEqual(size, 25, `Len ${len} must map to Version 2 (25x25)`);
    } else {
      assert.strictEqual(size, 29, `Len ${len} must map to Version 3 (29x29)`);
    }

    // Verify structural finder patterns
    // Top-left
    assert.strictEqual(matrix[0][0], 1);
    assert.strictEqual(matrix[0][6], 1);
    assert.strictEqual(matrix[6][0], 1);
    assert.strictEqual(matrix[6][6], 1);
    assert.strictEqual(matrix[3][3], 1);
    // Top-right
    assert.strictEqual(matrix[0][size - 7], 1);
    assert.strictEqual(matrix[0][size - 1], 1);
    assert.strictEqual(matrix[6][size - 7], 1);
    // Bottom-left
    assert.strictEqual(matrix[size - 7][0], 1);
    assert.strictEqual(matrix[size - 1][0], 1);
    assert.strictEqual(matrix[size - 7][6], 1);

    // Dark module at (size - 8, 8)
    assert.strictEqual(matrix[size - 8][8], 1, `Dark module must be present for len ${len}`);

    // Decode round-trip
    const decoded = decodeQrMatrix(matrix);
    assert.strictEqual(decoded, payload, `Decoded payload must exactly match original for length ${len}`);

    // SVG round-trip
    const svg = renderQrSvg(payload, 200);
    const svgDecoded = decodeQrSvg(svg);
    assert.strictEqual(svgDecoded, payload, `SVG decoded payload must match original for length ${len}`);

    // Verification oracle
    const vResult = verifyQrPayload(payload);
    assert.strictEqual(vResult.isValid, true);
    assert.strictEqual(vResult.eccValid, true);

    // Truncation check: mutate ONLY the last character and verify matrix difference
    const mutatedLast = payload.slice(0, -1) + (payload[payload.length - 1] === 'Z' ? 'Y' : 'Z');
    const comp = compareQrPayloads(payload, mutatedLast);
    assert.strictEqual(
      comp.isIdentical,
      false,
      `Mutating last character at index ${len - 1} must alter QR matrix (zero truncation)`
    );
    assert.ok(comp.differingModulesCount > 0);
  }
});

test('Adversarial Stress [QR Engine]: Exhaustive length sweep 1..55 bytes in Byte mode', () => {
  for (let len = 1; len <= 55; len++) {
    // Generate payload with lowercase characters to enforce Byte mode
    let payload = '';
    for (let i = 0; i < len; i++) {
      payload += String.fromCharCode(97 + (i % 26)); // 'a'..'z'
    }
    assert.strictEqual(payload.length, len, `Length must be ${len}`);
    assert.strictEqual(isAlphanumeric(payload), false, `Must be byte mode for len ${len}`);

    // Matrix generation
    const matrix = generateQrMatrix(payload);
    const size = matrix.length;

    // Check version sizing boundaries for byte mode:
    // v1: len <= 17 -> size 21
    // v2: len 18..32 -> size 25
    // v3: len 33..53 -> size 29
    // v4: len 54..78 -> size 33
    if (len <= 17) {
      assert.strictEqual(size, 21, `Byte len ${len} must map to Version 1 (21x21)`);
    } else if (len <= 32) {
      assert.strictEqual(size, 25, `Byte len ${len} must map to Version 2 (25x25)`);
    } else if (len <= 53) {
      assert.strictEqual(size, 29, `Byte len ${len} must map to Version 3 (29x29)`);
    } else {
      assert.strictEqual(size, 33, `Byte len ${len} must map to Version 4 (33x33)`);
    }

    // Decode round-trip
    const decoded = decodeQrMatrix(matrix);
    assert.strictEqual(decoded, payload, `Byte decoded payload must match original for len ${len}`);

    // SVG round-trip
    const svg = renderQrSvg(payload, 200);
    const svgDecoded = decodeQrSvg(svg);
    assert.strictEqual(svgDecoded, payload, `Byte SVG decoded payload must match original for len ${len}`);

    // Truncation check: mutate ONLY the last character
    const mutatedLast = payload.slice(0, -1) + (payload[payload.length - 1] === 'z' ? 'y' : 'z');
    const comp = compareQrPayloads(payload, mutatedLast);
    assert.strictEqual(
      comp.isIdentical,
      false,
      `Byte mode: Mutating last character at index ${len - 1} must alter QR matrix`
    );
  }
});

test('Adversarial Stress [QR Engine]: 1,000 randomized pickup codes collision test', () => {
  const seenMatrices = new Set<string>();
  const seenCodes = new Set<string>();

  let seed = 987654321;
  const pseudoRandom = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

  for (let i = 0; i < 1000; i++) {
    // Generate Foodlink pickup code format: FOODLINK:FL-XXXXXX
    let randomPart = '';
    for (let c = 0; c < 6; c++) {
      randomPart += chars[Math.floor(pseudoRandom() * chars.length)];
    }
    const code = `FOODLINK:FL-${randomPart}`;
    if (seenCodes.has(code)) continue;
    seenCodes.add(code);

    const matrix = generateQrMatrix(code);
    const key = matrix.map(r => r.join('')).join('');

    assert.ok(
      !seenMatrices.has(key),
      `Matrix collision detected for unique pickup code ${code} at iteration ${i}`
    );
    seenMatrices.add(key);
  }

  assert.ok(seenMatrices.size >= 990, 'Must have at least 990 unique matrices generated');
});

// ----------------------------------------------------------------------------
// 2. CROSS-BUSINESS REDEMPTION SECURITY STRESS TEST HARNESS
// ----------------------------------------------------------------------------

for (const mode of ['memory', 'sql'] as const) {
  test(`Adversarial Stress [Security - ${mode} mode]: Comprehensive cross-business redemption rejection`, async () => {
    let server: TestServerInstance | null = null;
    try {
      server = await startTestServer({ useMemory: mode === 'memory' });
      const baseUrl = server.baseUrl;

      const merchantA = `sec_merch_a_${mode}_${Date.now()}@test.foodlink.local`;
      const merchantB = `sec_merch_b_${mode}_${Date.now()}@test.foodlink.local`;
      const merchantC = `sec_merch_c_${mode}_${Date.now()}@test.foodlink.local`;
      const customer = `sec_cust_${mode}_${Date.now()}@test.foodlink.local`;

      // Register Business A
      const regARes = await fetch(`${baseUrl}/api/places/business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Restaurante Alfa',
          type: 'restaurante',
          address: 'Calle Roma 10, Cuauhtemoc',
          phone: '5511112222',
          lat: 19.42,
          lng: -99.16,
          owner_email: merchantA
        })
      });
      const bizA = (await regARes.json()).business;
      assert.ok(bizA?.id);

      // Register Business B
      const regBRes = await fetch(`${baseUrl}/api/places/business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Panaderia Beta',
          type: 'panaderia',
          address: 'Calle Condesa 20, Cuauhtemoc',
          phone: '5533334444',
          lat: 19.41,
          lng: -99.17,
          owner_email: merchantB
        })
      });
      const bizB = (await regBRes.json()).business;
      assert.ok(bizB?.id);

      // Register Business C
      const regCRes = await fetch(`${baseUrl}/api/places/business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Cafeteria Gamma',
          type: 'cafeteria',
          address: 'Calle Juarez 30, Cuauhtemoc',
          phone: '5555556666',
          lat: 19.43,
          lng: -99.15,
          owner_email: merchantC
        })
      });
      const bizC = (await regCRes.json()).business;
      assert.ok(bizC?.id);

      // Business A publishes offer
      const offerARes = await fetch(`${baseUrl}/api/places/business/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: bizA.id,
          email: merchantA,
          title: 'Combo Especial Alfa',
          originalPrice: 200,
          price: 100,
          quantity: 5,
          pickupHours: 4
        })
      });
      const offerA = (await offerARes.json()).offer;
      assert.ok(offerA?.id);

      // Customer reserves offer A
      const resOrderRes = await fetch(`${baseUrl}/api/places/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: customer,
          userName: 'Seguridad Cliente',
          offerId: offerA.id,
          quantity: 1
        })
      });
      const orderA = (await resOrderRes.json()).order;
      const pickupCode = orderA.pickup_code;
      assert.ok(pickupCode);

      const redeemUrl = `${baseUrl}/api/places/business/redeem`;

      // 1. Business B tries to redeem Order A -> HTTP 400
      const crossResB = await fetch(redeemUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_code: pickupCode,
          businessId: bizB.id
        })
      });
      assert.strictEqual(crossResB.status, 400, 'Cross-business redemption by Business B must fail with 400');
      const dataB = await crossResB.json();
      assert.strictEqual(dataB.success, false);
      assert.strictEqual(
        dataB.message,
        'El codigo de recogida pertenece a otro establecimiento y no puede canjearse aqui.'
      );

      // 2. Business C tries to redeem Order A -> HTTP 400
      const crossResC = await fetch(redeemUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_code: pickupCode,
          businessId: bizC.id
        })
      });
      assert.strictEqual(crossResC.status, 400, 'Cross-business redemption by Business C must fail with 400');
      const dataC = await crossResC.json();
      assert.strictEqual(dataC.success, false);
      assert.strictEqual(
        dataC.message,
        'El codigo de recogida pertenece a otro establecimiento y no puede canjearse aqui.'
      );

      // 3. Business B with FOODLINK: prefix -> HTTP 400
      const crossResPrefix = await fetch(redeemUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_code: `FOODLINK:${pickupCode}`,
          businessId: bizB.id
        })
      });
      assert.strictEqual(crossResPrefix.status, 400);
      const dataPrefix = await crossResPrefix.json();
      assert.strictEqual(dataPrefix.success, false);
      assert.strictEqual(
        dataPrefix.message,
        'El codigo de recogida pertenece a otro establecimiento y no puede canjearse aqui.'
      );

      // 4. Invalid business IDs (0, -1, string, null, undefined) -> HTTP 400
      const invalidBizIds = [0, -1, 'invalid_id', null, undefined];
      for (const badId of invalidBizIds) {
        const badIdRes = await fetch(redeemUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pickup_code: pickupCode,
            businessId: badId
          })
        });
        assert.strictEqual(
          badIdRes.status,
          400,
          `Invalid businessId (${badId}) must return HTTP 400`
        );
        const badIdData = await badIdRes.json();
        assert.strictEqual(badIdData.success, false);
      }

      // 5. Authorized redemption by Business A -> HTTP 200
      const legitRes = await fetch(redeemUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_code: pickupCode,
          businessId: bizA.id
        })
      });
      assert.strictEqual(legitRes.status, 200, 'Legitimate redemption by Business A must succeed with 200');
      const legitData = await legitRes.json();
      assert.strictEqual(legitData.success, true);
      assert.strictEqual(legitData.order?.status, 'picked_up');

      // 6. Post-redemption: Replay attack by Business B -> HTTP 400 (not 200!)
      const replayResB = await fetch(redeemUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_code: pickupCode,
          businessId: bizB.id
        })
      });
      assert.strictEqual(replayResB.status, 400, 'Replay attack by wrong business must fail with 400');
    } finally {
      if (server) await server.stop();
    }
  });
}
