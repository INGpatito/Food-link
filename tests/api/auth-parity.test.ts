import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServerInstance } from '../helpers/serverHelper.ts';

for (const mode of ['memory', 'sql'] as const) {
  test(`Auth Parity [${mode} mode]: Complete registration, verification, resend, and me lifecycle`, async () => {
    let server: TestServerInstance | null = null;
    try {
      server = await startTestServer({ useMemory: mode === 'memory' });
      const baseUrl = server.baseUrl;

      const testEmail = `auth_${mode}_${Date.now()}@test.foodlink.local`;
      const testName = 'Daniela Vega';
      const testPassword = 'SecurePassword456!';

      // 1. Register new account
      const regRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: testName,
          email: testEmail,
          password: testPassword
        })
      });

      assert.strictEqual(
        regRes.status === 200 || regRes.status === 201,
        true,
        `Register must return 200 or 201 (got ${regRes.status})`
      );
      const regData = await regRes.json();
      assert.strictEqual(regData.success, true);
      assert.strictEqual(regData.user?.email, testEmail);
      assert.strictEqual(regData.user?.name, testName);
      assert.strictEqual(Boolean(regData.user?.is_verified), false);

      // 2. Query /api/auth/me before verification
      const meUnverifiedRes = await fetch(
        `${baseUrl}/api/auth/me?email=${encodeURIComponent(testEmail)}`
      );
      assert.strictEqual(meUnverifiedRes.status, 200);
      const meUnverifiedData = await meUnverifiedRes.json();
      assert.strictEqual(meUnverifiedData.success, true);
      assert.strictEqual(Boolean(meUnverifiedData.user?.is_verified), false);

      // 3. Test verification with WRONG code (Boundary case)
      const wrongVerifyRes = await fetch(`${baseUrl}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          code: '000000'
        })
      });
      assert.strictEqual(
        wrongVerifyRes.status,
        400,
        'Verification with wrong code must return status 400'
      );
      const wrongVerifyData = await wrongVerifyRes.json();
      assert.strictEqual(wrongVerifyData.success, false);

      // 4. Request code resend via /api/auth/resend-code
      const resendRes = await fetch(`${baseUrl}/api/auth/resend-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail
        })
      });
      assert.strictEqual(resendRes.status, 200, 'Resend code must return 200');
      const resendData = await resendRes.json();
      assert.strictEqual(resendData.success, true);
      const verificationCode = resendData.verificationCode || regData.verificationCode;
      assert.ok(verificationCode, 'Must obtain a 6-digit verification code');
      assert.strictEqual(String(verificationCode).length, 6, 'Verification code must be 6 digits');

      // 5. Verify account with valid code
      const verifyRes = await fetch(`${baseUrl}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          code: verificationCode
        })
      });
      assert.strictEqual(verifyRes.status, 200, 'Verification with valid code must return 200');
      const verifyData = await verifyRes.json();
      assert.strictEqual(verifyData.success, true);
      assert.strictEqual(Boolean(verifyData.user?.is_verified), true);

      // 6. Query /api/auth/me after verification
      const meVerifiedRes = await fetch(
        `${baseUrl}/api/auth/me?email=${encodeURIComponent(testEmail)}`
      );
      assert.strictEqual(meVerifiedRes.status, 200);
      const meVerifiedData = await meVerifiedRes.json();
      assert.strictEqual(meVerifiedData.success, true);
      assert.strictEqual(
        Boolean(meVerifiedData.user?.is_verified),
        true,
        'User must be marked is_verified: true in /api/auth/me'
      );

      // 7. Verify already verified account handling
      const alreadyVerifiedRes = await fetch(`${baseUrl}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          code: verificationCode
        })
      });
      assert.strictEqual(alreadyVerifiedRes.status, 200);
      const alreadyVerifiedData = await alreadyVerifiedRes.json();
      assert.strictEqual(alreadyVerifiedData.success, true);
    } finally {
      if (server) await server.stop();
    }
  });

  test(`Auth Parity [${mode} mode]: Boundary validation (empty fields, missing email)`, async () => {
    let server: TestServerInstance | null = null;
    try {
      server = await startTestServer({ useMemory: mode === 'memory' });
      const baseUrl = server.baseUrl;

      // Empty registration
      const emptyRegRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      assert.strictEqual(emptyRegRes.status, 400);

      // Missing email in /api/auth/me
      const missingEmailMeRes = await fetch(`${baseUrl}/api/auth/me`);
      assert.strictEqual(missingEmailMeRes.status, 400);

      // Missing email in /api/auth/resend-code
      const missingEmailResendRes = await fetch(`${baseUrl}/api/auth/resend-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      assert.strictEqual(missingEmailResendRes.status, 400);
    } finally {
      if (server) await server.stop();
    }
  });
}
