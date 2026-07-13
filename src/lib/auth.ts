// Client-side auth/session helpers. Tokens live in localStorage (remember me)
// or sessionStorage; every consumer should go through these helpers instead of
// touching storage directly.

export interface StoredUser {
  _id?: string;
  id?: string;
  name: string;
  email: string;
}

const isBrowser = () => typeof window !== 'undefined';

export function getToken(): string | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!raw) return null;
  return raw.startsWith('Bearer ') ? raw.slice(7) : raw;
}

export function getUser(): StoredUser | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function storeSession(token: string, user: StoredUser, remember: boolean) {
  if (!isBrowser()) return;
  const store = remember ? localStorage : sessionStorage;
  store.setItem('token', token);
  store.setItem('user', JSON.stringify(user));
  window.dispatchEvent(new Event('authChanged'));
}

export function clearSession() {
  if (!isBrowser()) return;
  // Only remove auth keys; keep draft resume data so guests don't lose work.
  ['token', 'user'].forEach((k) => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
  window.dispatchEvent(new Event('authChanged'));
}
