import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServerInstance } from '../helpers/serverHelper.ts';

for (const mode of ['memory', 'sql'] as const) {
  test(`Business Security [${mode} mode]: Ownership isolation and no demo leak`, async () => {
    let server: TestServerInstance | null = null;
    try {
      server = await startTestServer({ useMemory: mode === 'memory' });
      const baseUrl = server.baseUrl;

      const unrelatedEmail = `unrelated_${mode}_${Date.now()}@test.foodlink.local`;

      // 1. Query business panel for user with NO registered business
      const panelRes = await fetch(
        `${baseUrl}/api/places/business/panel?email=${encodeURIComponent(unrelatedEmail)}`
      );
      assert.strictEqual(panelRes.status, 200, 'Panel query must return 200');
      const panelData = await panelRes.json();

      assert.strictEqual(panelData.success, true, 'Panel response must have success: true');
      assert.strictEqual(
        panelData.business,
        null,
        'User with no business must have business === null (no demo leak)'
      );
      assert.deepStrictEqual(
        panelData.available_businesses,
        [],
        'available_businesses must be empty array for non-merchant user'
      );

      // 2. Register Business A for Merchant A
      const merchantA = `merchant_a_${mode}_${Date.now()}@test.foodlink.local`;
      const regBizRes = await fetch(`${baseUrl}/api/places/business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Panaderia Artesanal A',
          type: 'panaderia',
          address: 'Calle Colima 123, Roma Norte',
          phone: '5511223344',
          lat: 19.4185,
          lng: -99.1625,
          owner_email: merchantA
        })
      });
      assert.ok(
        regBizRes.status === 200 || regBizRes.status === 201,
        `Business registration must return 200 or 201 (got ${regBizRes.status})`
      );
      const regBizData = await regBizRes.json();
      assert.strictEqual(regBizData.success, true);
      const bizAId = regBizData.business?.id;
      assert.ok(bizAId, 'Business A must have a valid id');

      // 3. Unrelated user attempts to view Business A via businessId param
      const leakAttemptRes = await fetch(
        `${baseUrl}/api/places/business/panel?email=${encodeURIComponent(unrelatedEmail)}&businessId=${bizAId}`
      );
      const leakAttemptData = await leakAttemptRes.json();

      // Must NOT leak Business A to unrelated user
      assert.strictEqual(
        leakAttemptData.business,
        null,
        'Unrelated user must NOT be able to view Business A by passing businessId'
      );
      assert.deepStrictEqual(
        leakAttemptData.available_businesses,
        [],
        'Unrelated user must NOT receive Business A in available_businesses'
      );
    } finally {
      if (server) await server.stop();
    }
  });

  test(`Business Security [${mode} mode]: Price validation and offer authorization`, async () => {
    let server: TestServerInstance | null = null;
    try {
      server = await startTestServer({ useMemory: mode === 'memory' });
      const baseUrl = server.baseUrl;

      const merchantA = `merch_price_a_${mode}_${Date.now()}@test.foodlink.local`;
      const merchantB = `merch_price_b_${mode}_${Date.now()}@test.foodlink.local`;

      // Register Business A
      const regBizRes = await fetch(`${baseUrl}/api/places/business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Taqueria San Angel A',
          type: 'restaurante',
          address: 'Av Revolucion 50, CDMX',
          phone: '5599887766',
          lat: 19.3512,
          lng: -99.1895,
          owner_email: merchantA
        })
      });
      const regBizData = await regBizRes.json();
      const bizAId = regBizData.business?.id;
      assert.ok(bizAId);

      // Boundary: price > original_price rejection (400)
      const badPriceRes = await fetch(`${baseUrl}/api/places/business/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: bizAId,
          email: merchantA,
          title: 'Paquete Invalido',
          originalPrice: 100,
          price: 150, // Invalid: price > originalPrice
          quantity: 3,
          pickupHours: 2
        })
      });
      assert.strictEqual(
        badPriceRes.status,
        400,
        'Offer with price > original_price must be rejected with status 400'
      );

      // Authorization: Merchant B attempts to create offer for Business A
      const unauthOfferRes = await fetch(`${baseUrl}/api/places/business/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: bizAId,
          email: merchantB, // Different merchant
          title: 'Oferta Ilegitima',
          originalPrice: 120,
          price: 60,
          quantity: 2,
          pickupHours: 1.5
        })
      });
      assert.ok(
        unauthOfferRes.status === 403 || unauthOfferRes.status === 400,
        `Non-owner creating offer must be rejected (got ${unauthOfferRes.status})`
      );

      // Valid offer creation by legitimate owner Merchant A
      const validOfferRes = await fetch(`${baseUrl}/api/places/business/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: bizAId,
          email: merchantA,
          title: 'Tacos al Pastor 2x1',
          originalPrice: 140,
          price: 70,
          quantity: 5,
          pickupHours: 2
        })
      });
      assert.ok(
        validOfferRes.status === 200 || validOfferRes.status === 201,
        `Legitimate owner must be able to create offer (got ${validOfferRes.status})`
      );
      const validOfferData = await validOfferRes.json();
      const offerId = validOfferData.offer?.id;
      assert.ok(offerId);

      // Authorization: Merchant B attempts to close Merchant A offer
      const unauthCloseRes = await fetch(
        `${baseUrl}/api/places/business/offers/${offerId}/close`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: merchantB })
        }
      );
      assert.ok(
        unauthCloseRes.status === 403 || unauthCloseRes.status === 400,
        `Non-owner closing offer must be rejected (got ${unauthCloseRes.status})`
      );
    } finally {
      if (server) await server.stop();
    }
  });

  test(`Business Security [${mode} mode]: QR redemption store validation and full lifecycle`, async () => {
    let server: TestServerInstance | null = null;
    try {
      server = await startTestServer({ useMemory: mode === 'memory' });
      const baseUrl = server.baseUrl;

      const merchantA = `owner_red_a_${mode}_${Date.now()}@test.foodlink.local`;
      const merchantB = `owner_red_b_${mode}_${Date.now()}@test.foodlink.local`;
      const customerEmail = `customer_${mode}_${Date.now()}@test.foodlink.local`;

      // 1. Register Business A
      const regARes = await fetch(`${baseUrl}/api/places/business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Pizzeria Don Luigi',
          type: 'restaurante',
          address: 'Calle Florencia 45, Juarez',
          phone: '5533445566',
          lat: 19.4265,
          lng: -99.1652,
          owner_email: merchantA
        })
      });
      const bizA = (await regARes.json()).business;
      assert.ok(bizA?.id);

      // 2. Register Business B
      const regBRes = await fetch(`${baseUrl}/api/places/business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Cafeteria La Selva',
          type: 'cafeteria',
          address: 'Calle Havre 20, Juarez',
          phone: '5577889900',
          lat: 19.4278,
          lng: -99.1614,
          owner_email: merchantB
        })
      });
      const bizB = (await regBRes.json()).business;
      assert.ok(bizB?.id);

      // 3. Merchant A publishes an offer
      const offerRes = await fetch(`${baseUrl}/api/places/business/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: bizA.id,
          email: merchantA,
          title: 'Pizza Margherita Grande',
          originalPrice: 200,
          price: 100,
          quantity: 2,
          pickupHours: 3
        })
      });
      const offerData = await offerRes.json();
      const offerId = offerData.offer?.id;
      assert.ok(offerId);

      // 4. Customer reserves the offer
      const orderRes = await fetch(`${baseUrl}/api/places/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: customerEmail,
          userName: 'Carlos Cliente',
          offerId,
          quantity: 1
        })
      });
      assert.ok(
        orderRes.status === 200 || orderRes.status === 201,
        `Order reservation must succeed with 200 or 201 (got ${orderRes.status})`
      );
      const orderData = await orderRes.json();
      const pickupCode = orderData.order?.pickup_code;
      assert.ok(pickupCode, 'Reservation must return valid pickup_code');

      // 5. Merchant B attempts to redeem Customer pickup code for Business B
      // This MUST return status 400 because code belongs to Business A
      const redeemEndpoint = `${baseUrl}/api/places/business/redeem`;
      const wrongRedeemRes = await fetch(redeemEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_code: pickupCode,
          businessId: bizB.id // Wrong business
        })
      });
      assert.strictEqual(
        wrongRedeemRes.status,
        400,
        'Redeeming code for wrong businessId must be rejected with status 400'
      );
      const wrongRedeemData = await wrongRedeemRes.json();
      assert.strictEqual(wrongRedeemData.success, false);

      // 6. Merchant A redeems Customer pickup code for Business A (Correct)
      const correctRedeemRes = await fetch(redeemEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_code: pickupCode,
          businessId: bizA.id // Correct business
        })
      });
      assert.strictEqual(
        correctRedeemRes.status,
        200,
        'Redeeming code with matching businessId must succeed with 200'
      );
      const correctRedeemData = await correctRedeemRes.json();
      assert.strictEqual(correctRedeemData.success, true);
      assert.strictEqual(
        correctRedeemData.order?.status,
        'picked_up',
        'Order status must be updated to picked_up'
      );

      // 7. Duplicate redemption attempt should fail
      const dupRedeemRes = await fetch(redeemEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_code: pickupCode,
          businessId: bizA.id
        })
      });
      assert.strictEqual(
        dupRedeemRes.status,
        400,
        'Re-redeeming already picked_up order must return 400'
      );
    } finally {
      if (server) await server.stop();
    }
  });

  test(`Business Security [${mode} mode]: Business panel orders serialize pickup window & has_review and close offer honors owner email`, async () => {
    let server: TestServerInstance | null = null;
    try {
      server = await startTestServer({ useMemory: mode === 'memory' });
      const baseUrl = server.baseUrl;

      const merchantEmail = `panel_owner_${mode}_${Date.now()}@test.foodlink.local`;
      const otherEmail = `panel_other_${mode}_${Date.now()}@test.foodlink.local`;
      const customerEmail = `panel_buyer_${mode}_${Date.now()}@test.foodlink.local`;

      // 1. Register business
      const bizRes = await fetch(`${baseUrl}/api/places/business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Cafe La Roma',
          type: 'cafeteria',
          address: 'Plaza Rio de Janeiro 10',
          phone: '5511002200',
          lat: 19.421,
          lng: -99.160,
          owner_email: merchantEmail
        })
      });
      const bizData = await bizRes.json();
      assert.strictEqual(bizData.success, true);
      const bizId = bizData.business.id;

      // 2. Publish offer
      const offerRes = await fetch(`${baseUrl}/api/places/business/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: bizId,
          email: merchantEmail,
          title: 'Bagel + Cafe',
          originalPrice: 120,
          price: 55,
          quantity: 3,
          pickupHours: 2
        })
      });
      const offerData = await offerRes.json();
      assert.strictEqual(offerData.success, true);
      const offerId = offerData.offer.id;

      // 3. Reserve offer so panel has a pending order
      const orderRes = await fetch(`${baseUrl}/api/places/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: customerEmail,
          userName: 'Lucia',
          offerId,
          quantity: 1
        })
      });
      assert.ok(orderRes.status === 200 || orderRes.status === 201);

      // 4. Fetch business panel and assert pending order contains valid pickup_start, pickup_end, and has_review
      const panelRes = await fetch(
        `${baseUrl}/api/places/business/panel?email=${encodeURIComponent(merchantEmail)}&businessId=${bizId}`
      );
      assert.strictEqual(panelRes.status, 200);
      const panelData = await panelRes.json();
      assert.strictEqual(panelData.success, true);
      assert.strictEqual(panelData.orders.pending.length, 1);

      const pendingOrder = panelData.orders.pending[0];
      assert.ok(pendingOrder.pickup_start, 'pending order must include pickup_start');
      assert.ok(pendingOrder.pickup_end, 'pending order must include pickup_end');
      assert.ok(!Number.isNaN(Date.parse(pendingOrder.pickup_start)), 'pickup_start must be valid date');
      assert.ok(!Number.isNaN(Date.parse(pendingOrder.pickup_end)), 'pickup_end must be valid date');
      assert.strictEqual(pendingOrder.has_review, false, 'new pending order must serialize has_review as false');

      // 5. Closing offer without email or with wrong email returns 403
      const closeNoEmailRes = await fetch(`${baseUrl}/api/places/business/offers/${offerId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: '' })
      });
      assert.strictEqual(closeNoEmailRes.status, 403, 'Closing offer with empty email must return 403');

      const closeWrongEmailRes = await fetch(`${baseUrl}/api/places/business/offers/${offerId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otherEmail })
      });
      assert.strictEqual(closeWrongEmailRes.status, 403, 'Closing offer with wrong owner email must return 403');

      // 6. Closing offer with owner email succeeds and marks offer closed
      const closeOwnerRes = await fetch(`${baseUrl}/api/places/business/offers/${offerId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: merchantEmail })
      });
      assert.strictEqual(closeOwnerRes.status, 200, 'Closing offer with owner email must return 200');
      const closeOwnerData = await closeOwnerRes.json();
      assert.strictEqual(closeOwnerData.success, true);

      // Verify offer no longer active in panel stats
      const afterCloseRes = await fetch(
        `${baseUrl}/api/places/business/panel?email=${encodeURIComponent(merchantEmail)}&businessId=${bizId}`
      );
      const afterCloseData = await afterCloseRes.json();
      assert.strictEqual(afterCloseData.stats.active_offers, 0, 'Closed offer must no longer count as active');
    } finally {
      if (server) await server.stop();
    }
  });
}

test('SQL Schema Migration: ensurePlacesSchema adds missing orders.has_review on legacy table and serves business panel', async () => {
  try {
    process.loadEnvFile?.('.env');
  } catch {
    // Use existing env or defaults
  }

  const mysql = await import('mysql2/promise');
  const http = await import('node:http');
  const { ensurePlacesSchema, handlePlacesRequest } = await import('../../server/placesApi.mjs');

  const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'pato'
  };

  const probeDb = `footlink_legacy_mig_${Date.now()}`;
  const adminConn = await mysql.createConnection(dbConfig);
  await adminConn.query(`CREATE DATABASE \`${probeDb}\``);

  const probePool = mysql.createPool({
    ...dbConfig,
    database: probeDb,
    waitForConnections: true,
    connectionLimit: 5
  });

  let probeServer: import('node:http').Server | null = null;
  try {
    await probePool.query(`CREATE TABLE businesses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      owner_id INT NULL,
      owner_email VARCHAR(190) DEFAULT NULL,
      name VARCHAR(140) NOT NULL,
      type ENUM('restaurante','fonda','panaderia','cafeteria','puesto','mercado','comedor','otro') NOT NULL DEFAULT 'otro',
      description VARCHAR(500) DEFAULT NULL,
      address VARCHAR(255) DEFAULT NULL,
      phone VARCHAR(30) DEFAULT NULL,
      lat DECIMAL(9,6) NOT NULL,
      lng DECIMAL(9,6) NOT NULL,
      opening_hours VARCHAR(255) DEFAULT NULL,
      image_url VARCHAR(500) DEFAULT NULL,
      rating_avg DECIMAL(3,2) NOT NULL DEFAULT 4.80,
      rating_count INT NOT NULL DEFAULT 1,
      is_verified TINYINT(1) NOT NULL DEFAULT 0,
      is_demo TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await probePool.query(`CREATE TABLE offers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id INT NOT NULL,
      title VARCHAR(140) NOT NULL,
      description VARCHAR(500) DEFAULT NULL,
      kind ENUM('producto','paquete_sorpresa') NOT NULL DEFAULT 'producto',
      original_price DECIMAL(8,2) NOT NULL DEFAULT 0,
      price DECIMAL(8,2) NOT NULL DEFAULT 0,
      quantity_total INT NOT NULL DEFAULT 1,
      quantity_left INT NOT NULL DEFAULT 1,
      est_weight_kg DECIMAL(6,2) NOT NULL DEFAULT 0.65,
      pickup_start DATETIME NOT NULL,
      pickup_end DATETIME NOT NULL,
      tags VARCHAR(255) DEFAULT NULL,
      allergens VARCHAR(255) DEFAULT NULL,
      status ENUM('active','sold_out','expired','cancelled') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // Legacy orders table intentionally WITHOUT has_review column
    await probePool.query(`CREATE TABLE orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_email VARCHAR(190) NOT NULL,
      user_name VARCHAR(140) NOT NULL DEFAULT 'Comensal',
      business_id INT NOT NULL,
      offer_id INT NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      unit_price DECIMAL(8,2) NOT NULL DEFAULT 0,
      original_unit_price DECIMAL(8,2) NOT NULL DEFAULT 0,
      total_price DECIMAL(8,2) NOT NULL DEFAULT 0,
      est_weight_kg DECIMAL(6,2) NOT NULL DEFAULT 0.65,
      pickup_code VARCHAR(24) NOT NULL,
      status ENUM('reserved','picked_up','cancelled') NOT NULL DEFAULT 'reserved',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      picked_up_at DATETIME DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await ensurePlacesSchema(probePool);

    const [hasReviewCols] = await probePool.query(`SHOW COLUMNS FROM orders LIKE 'has_review'`);
    assert.strictEqual((hasReviewCols as any[]).length, 1, 'SCHEMA_ALTERS must add missing orders.has_review column');

    const ownerEmail = 'legacy_owner@example.com';
    const [bizInsert] = await probePool.query(
      `INSERT INTO businesses (owner_email, name, type, address, lat, lng) VALUES (?, 'Fonda Legacy', 'fonda', 'Calle 1', 19.43, -99.13)`,
      [ownerEmail]
    );
    const bizId = (bizInsert as any).insertId;
    const [offInsert] = await probePool.query(
      `INSERT INTO offers (business_id, title, kind, original_price, price, quantity_total, quantity_left, pickup_start, pickup_end, status)
       VALUES (?, 'Menu Legacy', 'producto', 90, 40, 3, 2, NOW(), DATE_ADD(NOW(), INTERVAL 3 HOUR), 'active')`,
      [bizId]
    );
    const offerId = (offInsert as any).insertId;
    await probePool.query(
      `INSERT INTO orders (user_email, user_name, business_id, offer_id, quantity, total_price, est_weight_kg, pickup_code, status)
       VALUES ('buyer@example.com', 'Comensal Legacy', ?, ?, 1, 40, 0.7, 'FL-LEG01', 'reserved')`,
      [bizId, offerId]
    );

    const sendJson = (res: import('node:http').ServerResponse, status: number, body: unknown) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(body));
    };

    probeServer = http.createServer(async (req, res) => {
      const reqUrl = new URL(req.url || '/', 'http://127.0.0.1');
      const handled = await handlePlacesRequest(req, res, reqUrl, probePool, sendJson);
      if (!handled) sendJson(res, 404, { success: false });
    });

    await new Promise<void>((resolve) => probeServer!.listen(0, '127.0.0.1', resolve));
    const addr = probeServer.address() as import('node:net').AddressInfo;
    const panelRes = await fetch(
      `http://127.0.0.1:${addr.port}/api/places/business/panel?email=${encodeURIComponent(ownerEmail)}&businessId=${bizId}`
    );
    assert.strictEqual(panelRes.status, 200);
    const panelData = await panelRes.json();
    assert.strictEqual(panelData.success, true);
    assert.strictEqual(panelData.orders.pending.length, 1);
    assert.strictEqual(panelData.orders.pending[0].has_review, false);
    assert.ok(!Number.isNaN(Date.parse(panelData.orders.pending[0].pickup_start)));
    assert.ok(!Number.isNaN(Date.parse(panelData.orders.pending[0].pickup_end)));
  } finally {
    if (probeServer) await new Promise<void>((resolve) => probeServer!.close(() => resolve()));
    await probePool.end();
    await adminConn.query(`DROP DATABASE IF EXISTS \`${probeDb}\``);
    await adminConn.end();
  }
});

