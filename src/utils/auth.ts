export interface AuthUser {
  id: number;
  name: string;
  email: string;
  is_verified: boolean;
}

const STORAGE_KEY = 'foodlink_user';
const AUTH_EVENT_NAME = 'foodlink:auth-changed';
const CHANNEL_NAME = 'foodlink_auth';

let authChannel: BroadcastChannel | null = null;
if (typeof BroadcastChannel !== 'undefined') {
  try {
    authChannel = new BroadcastChannel(CHANNEL_NAME);
    if (typeof (authChannel as any).unref === 'function') {
      (authChannel as any).unref();
    }
    authChannel.onmessage = () => {
      notifyAuthChange(false);
    };
  } catch {
    authChannel = null;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      notifyAuthChange(false);
    }
  });
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    notifyAuthChange(true);
  } catch (error) {
    console.error('No se pudo guardar la sesion:', error);
  }
}

export function clearStoredUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    notifyAuthChange(true);
  } catch (error) {
    console.error('No se pudo limpiar la sesion:', error);
  }
}

export function notifyAuthChange(broadcast = true): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT_NAME, { detail: getStoredUser() }));
  }
  if (broadcast && authChannel) {
    try {
      authChannel.postMessage({ type: 'auth-change', user: getStoredUser() });
    } catch {
      // ignore channel broadcast failure
    }
  }
}

export function onAuthChange(callback: (user: AuthUser | null) => void): () => void {
  const handler = () => {
    callback(getStoredUser());
  };
  if (typeof window !== 'undefined') {
    window.addEventListener(AUTH_EVENT_NAME, handler);
    return () => {
      window.removeEventListener(AUTH_EVENT_NAME, handler);
    };
  }
  return () => {};
}
