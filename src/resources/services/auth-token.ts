/**
 * Storage of, and access to, the bearer token issued by `mmar-server`.
 *
 * The token is the one piece of state shared between the auth store (which
 * obtains and clears it) and the backend service (which sends it on every
 * request), so both go through here rather than reaching into `localStorage`
 * under a string key each of them spells out separately.
 *
 * Every accessor is guarded: the modules that use them are also imported by unit
 * tests running outside a DOM, where touching `localStorage` throws.
 */
const AUTH_TOKEN_KEY = "auth_token";

/** The stored token, or `null` when nobody is signed in. */
export function readAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function writeAuthToken(token: string): void {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    /* no storage outside the browser — nothing to persist to */
  }
}

export function clearAuthToken(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    /* no storage outside the browser — nothing to clear */
  }
}

/**
 * Request headers carrying the stored token, or `null` when there is none.
 *
 * Returning `null` rather than throwing lets callers bail out quietly: a request
 * fired while signed out is an ordinary state (the left navigation loads before
 * the sign-in dialog is dismissed), not an error worth logging.
 */
export function authHeaders(): Record<string, string> | null {
  const token = readAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : null;
}
