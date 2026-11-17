import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServerInstance } from '../helpers/serverHelper.ts';

// Test preferences persistence in both in-memory and SQL mode
for (const mode of ['memory', 'sql'] as const) {
  test(`Preferences API [${mode} mode]: Full persistence and name protection`, async () => {
    let server: TestServerInstance | null = null;
    try {
      server = await startTestServer({ useMemory: mode === 'memory' });
      const baseUrl = server.baseUrl;

      const testEmail = `pref_${mode}_${Date.now()}@test.foodlink.local`;
      const originalName = 'Alejandro Morales';
      const pickupAlias = 'Alex Express';
      const role = 'comercio';
      const zoneNote = 'Roma Norte, CDMX';
      const dietaryTags = ['vegano', 'sin_gluten'];
      const notifyFavorites = true;

      // 1. Register user
      const regRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: originalName,
          email: testEmail,
          password: 'Password123!'
        })
      });

      // User registration might succeed (200/201) or auth fallback might be active
      const regData = await regRes.json();
      assert.ok(regRes.status === 200 || regRes.status === 201, `Registration failed: ${JSON.stringify(regData)}`);

      // 2. Save profile preferences
      const saveRes = await fetch(`${baseUrl}/api/places/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: testEmail,
          pickup_alias: pickupAlias,
          role,
          zone_note: zoneNote,
          dietary_tags: dietaryTags,
          notify_favorites: notifyFavorites
        })
      });

      assert.strictEqual(saveRes.status, 200, 'Profile save must return 200');
      const saveData = await saveRes.json();
      assert.strictEqual(saveData.success, true, 'Save response must have success: true');

      // 3. Fetch profile preferences
      const getRes = await fetch(`${baseUrl}/api/places/profile?email=${encodeURIComponent(testEmail)}`);
      assert.strictEqual(getRes.status, 200, 'Profile fetch must return 200');
      const getData = await getRes.json();
      assert.strictEqual(getData.success, true, 'Fetch response must have success: true');

      const profile = getData.profile;
      assert.ok(profile, 'Profile object must exist');
      assert.strictEqual(profile.pickup_alias, pickupAlias, 'pickup_alias must persist');
      assert.strictEqual(profile.role, role, 'role must persist');
      assert.strictEqual(profile.zone_note, zoneNote, 'zone_note must persist');
      assert.deepStrictEqual(profile.dietary_tags, dietaryTags, 'dietary_tags must persist as array');
      assert.strictEqual(Boolean(profile.notify_favorites), notifyFavorites, 'notify_favorites must persist');

      // 4. Verify account name was NEVER overwritten by pickup_alias
      const meRes = await fetch(`${baseUrl}/api/auth/me`, {
        headers: {
          Cookie: regRes.headers.get('set-cookie') || ''
        }
      });
      if (meRes.status === 200) {
        const meData = await meRes.json();
        assert.strictEqual(meData.user?.name, originalName, 'Account name must not be overwritten by pickup_alias in auth');
      }

      // Also check profile's name if returned
      if (profile.name) {
        assert.strictEqual(profile.name, originalName, 'Profile account name must remain original');
      }
    } finally {
      if (server) await server.stop();
    }
  });

  test(`Preferences API [${mode} mode]: Boundary & partial updates`, async () => {
    let server: TestServerInstance | null = null;
    try {
      server = await startTestServer({ useMemory: mode === 'memory' });
      const baseUrl = server.baseUrl;

      const testEmail = `partial_${mode}_${Date.now()}@test.foodlink.local`;

      // Update with empty dietary tags and notify_favorites: false
      const saveRes = await fetch(`${baseUrl}/api/places/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: testEmail,
          pickup_alias: 'Solo Alias',
          dietary_tags: [],
          notify_favorites: false
        })
      });

      assert.strictEqual(saveRes.status, 200);
      const saveData = await saveRes.json();
      assert.strictEqual(saveData.success, true);

      // Fetch and verify
      const getRes = await fetch(`${baseUrl}/api/places/profile?email=${encodeURIComponent(testEmail)}`);
      const getData = await getRes.json();
      assert.strictEqual(getData.profile?.pickup_alias, 'Solo Alias');
      assert.deepStrictEqual(getData.profile?.dietary_tags, []);
      assert.strictEqual(Boolean(getData.profile?.notify_favorites), false);
    } finally {
      if (server) await server.stop();
    }
  });
}
