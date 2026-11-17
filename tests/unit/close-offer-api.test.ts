import test from 'node:test';
import assert from 'node:assert/strict';

class MockLocalStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

const mockStorage = new MockLocalStorage();
const eventListeners = new Map<string, Array<(event: any) => void>>();

(globalThis as any).localStorage = mockStorage;
(globalThis as any).window = {
  addEventListener(type: string, listener: (event: any) => void) {
    if (!eventListeners.has(type)) eventListeners.set(type, []);
    eventListeners.get(type)!.push(listener);
  },
  removeEventListener(type: string, listener: (event: any) => void) {
    const list = eventListeners.get(type) || [];
    eventListeners.set(type, list.filter((l) => l !== listener));
  },
  dispatchEvent(event: any) {
    const list = eventListeners.get(event.type) || [];
    for (const l of list) l(event);
    return true;
  }
};
(globalThis as any).CustomEvent = class CustomEvent {
  type: string;
  detail: any;
  constructor(type: string, init?: { detail?: any }) {
    this.type = type;
    this.detail = init?.detail;
  }
};

const { setStoredUser, clearStoredUser } = await import('../../src/utils/auth.ts');
const { closeBusinessOffer, fetchNearby } = await import('../../src/explorar/api.ts');

test('API Client Unit: closeBusinessOffer sends normalized explicit email as JSON', async () => {
  mockStorage.clear();
  clearStoredUser();

  const origFetch = globalThis.fetch;
  let capturedUrl = '';
  let capturedInit: RequestInit | undefined;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedInit = init;
    return new Response(JSON.stringify({ success: true, message: 'Oferta finalizada.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }) as typeof fetch;

  try {
    const res = await closeBusinessOffer(42, '  Dueño@Ejemplo.MX  ');
    assert.strictEqual(res.message, 'Oferta finalizada.');
    assert.strictEqual(capturedUrl, '/api/places/business/offers/42/close');
    assert.strictEqual(capturedInit?.method, 'POST');
    assert.deepStrictEqual(capturedInit?.headers, { 'Content-Type': 'application/json' });
    assert.deepStrictEqual(JSON.parse(String(capturedInit?.body)), { email: 'dueño@ejemplo.mx' });
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('API Client Unit: closeBusinessOffer falls back to stored user email when omitted', async () => {
  mockStorage.clear();
  setStoredUser({ id: 9, name: 'Ana', email: 'Ana.Negocio@Example.com', is_verified: true });

  const origFetch = globalThis.fetch;
  let capturedBody: any = null;

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    capturedBody = JSON.parse(String(init?.body || '{}'));
    return new Response(JSON.stringify({ success: true, message: 'Oferta cerrada.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }) as typeof fetch;

  try {
    await closeBusinessOffer(17);
    assert.deepStrictEqual(capturedBody, { email: 'ana.negocio@example.com' });
  } finally {
    globalThis.fetch = origFetch;
    clearStoredUser();
  }
});

test('API Client Unit: closeBusinessOffer surfaces backend 403 error message when unauthorized', async () => {
  mockStorage.clear();
  clearStoredUser();

  const origFetch = globalThis.fetch;
  let capturedBody: any = null;

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    capturedBody = JSON.parse(String(init?.body || '{}'));
    return new Response(
      JSON.stringify({ success: false, message: 'Tu sesión no coincide con el propietario de este comercio.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => closeBusinessOffer(99),
      (err: Error) => err.message === 'Tu sesión no coincide con el propietario de este comercio.'
    );
    assert.deepStrictEqual(capturedBody, { email: '' });
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('API Client Unit: fetchNearby includes favoritesOnly and withoutOffers query params', async () => {
  const origFetch = globalThis.fetch;
  let capturedUrl = '';

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    capturedUrl = String(input);
    return new Response(
      JSON.stringify({
        success: true,
        center: { lat: 19.43, lng: -99.13 },
        radius: 3000,
        filter: 'all',
        category: 'all',
        favorite_ids: [1],
        active_favorite_alerts: [],
        server_time: new Date().toISOString(),
        places: []
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;

  try {
    await fetchNearby(
      { lat: 19.43, lng: -99.13 },
      3000,
      'all',
      { favoritesOnly: true, withoutOffers: true, email: 'user@example.com' }
    );
    const parsed = new URL(capturedUrl, 'http://localhost');
    assert.strictEqual(parsed.searchParams.get('favoritesOnly'), '1');
    assert.strictEqual(parsed.searchParams.get('withoutOffers'), '1');
    assert.strictEqual(parsed.searchParams.get('email'), 'user@example.com');
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('API Client Unit: splitBusinessPanelOrders supports both { pending, history } object and legacy Order[]', async () => {
  const { splitBusinessPanelOrders } = await import('../../src/explorar/api.ts');

  const samplePending = { id: 1, status: 'reserved' } as any;
  const samplePicked = { id: 2, status: 'picked_up' } as any;
  const sampleCancelled = { id: 3, status: 'cancelled' } as any;

  assert.deepStrictEqual(
    splitBusinessPanelOrders({ pending: [samplePending], history: [samplePicked, sampleCancelled] }),
    { pending: [samplePending], history: [samplePicked, sampleCancelled] }
  );

  assert.deepStrictEqual(
    splitBusinessPanelOrders([samplePending, samplePicked, sampleCancelled]),
    { pending: [samplePending], history: [samplePicked, sampleCancelled] }
  );

  assert.deepStrictEqual(splitBusinessPanelOrders(undefined), { pending: [], history: [] });
});
