import test from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage and window environment for Node execution
class MockLocalStorage {
  private store: Map<string, string> = new Map();

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

// Setup simulated window environment
const mockStorage = new MockLocalStorage();
const eventListeners: Map<string, Array<(event: any) => void>> = new Map();

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

// Import module after mock environment is ready
const authModule = await import('../../src/utils/auth.ts');
const { getStoredUser, setStoredUser, clearStoredUser, notifyAuthChange, onAuthChange } = authModule;

test('Auth Unit: getStoredUser returns null when empty', () => {
  mockStorage.clear();
  assert.strictEqual(getStoredUser(), null);
});

test('Auth Unit: setStoredUser persists and notifies listeners', () => {
  mockStorage.clear();
  let notifiedUser: any = null;

  const unsubscribe = onAuthChange((user) => {
    notifiedUser = user;
  });

  const testUser = {
    id: 101,
    name: 'Comensal Test',
    email: 'test@foodlink.local',
    is_verified: true
  };

  setStoredUser(testUser);

  assert.deepStrictEqual(getStoredUser(), testUser);
  assert.deepStrictEqual(notifiedUser, testUser);

  unsubscribe();
});

test('Auth Unit: clearStoredUser removes session and notifies listeners', () => {
  let notifiedUser: any = 'placeholder';

  const unsubscribe = onAuthChange((user) => {
    notifiedUser = user;
  });

  clearStoredUser();

  assert.strictEqual(getStoredUser(), null);
  assert.strictEqual(notifiedUser, null);

  unsubscribe();
});

test('Auth Unit: Cross-tab BroadcastChannel propagates auth notifications', async () => {
  let receivedBroadcast = false;
  let receivedDetail: any = null;

  const peerChannel = new BroadcastChannel('foodlink_auth');
  peerChannel.onmessage = (event) => {
    receivedBroadcast = true;
    receivedDetail = event.data;
  };

  const testUser = {
    id: 202,
    name: 'Peer User',
    email: 'peer@foodlink.local',
    is_verified: false
  };

  setStoredUser(testUser);

  // Allow microtask tick for BroadcastChannel dispatch
  await new Promise((resolve) => setTimeout(resolve, 50));

  assert.strictEqual(receivedBroadcast, true);
  assert.deepStrictEqual(receivedDetail?.user, testUser);

  peerChannel.close();
});

test('Auth Unit: Storage event triggers intra-window notification', () => {
  let notifiedUser: any = null;

  const unsubscribe = onAuthChange((user) => {
    notifiedUser = user;
  });

  const remoteUser = {
    id: 303,
    name: 'Remote Tab User',
    email: 'remote@foodlink.local',
    is_verified: true
  };
  mockStorage.setItem('foodlink_user', JSON.stringify(remoteUser));

  // Simulate cross-tab storage event fired on window
  const storageListeners = eventListeners.get('storage') || [];
  for (const listener of storageListeners) {
    listener({ key: 'foodlink_user' });
  }

  assert.deepStrictEqual(notifiedUser, remoteUser);

  unsubscribe();
});
