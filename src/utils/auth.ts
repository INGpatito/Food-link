export interface AuthUser {
  id: number;
  name: string;
  email: string;
  is_verified: boolean;
}

const STORAGE_KEY = 'foodlink_user';
const AUTH_EVENT_NAME = 'foodlink:auth-changed';

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
    notifyAuthChange();
  } catch (error) {
    console.error('No se pudo guardar la sesion:', error);
  }
}

export function clearStoredUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    notifyAuthChange();
  } catch (error) {
    console.error('No se pudo limpiar la sesion:', error);
  }
}

export function notifyAuthChange(): void {
  window.dispatchEvent(new CustomEvent(AUTH_EVENT_NAME, { detail: getStoredUser() }));
}

export function onAuthChange(callback: (user: AuthUser | null) => void): () => void {
  const handler = () => {
    callback(getStoredUser());
  };
  window.addEventListener(AUTH_EVENT_NAME, handler);
  return () => {
    window.removeEventListener(AUTH_EVENT_NAME, handler);
  };
}
