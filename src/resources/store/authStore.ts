import { create } from "zustand";
import { jwtDecode } from "jwt-decode";
import { apiFetch, errorMessageOf } from "@/resources/services/api";
import { clearAuthToken, readAuthToken, writeAuthToken } from "@/resources/services/auth-token";
import { eventBus } from "@/resources/services/event-bus";
import { useLogStore } from "./logStore";

/**
 * Who is signed in, and the credentials the backend service sends on their
 * behalf.
 *
 * The session is the bearer token in local storage; `currentUser` is derived
 * from its claims, so the store rehydrates itself on load and a reload keeps you
 * signed in.
 */

export interface CurrentUser {
  username: string;
  isAdmin: boolean;
}

/** The claims `mmar-server` puts in the token beyond the registered ones. */
interface TokenClaims {
  username?: string;
  isAdmin?: boolean;
  exp?: number;
}

const decodeToken = (token: string): TokenClaims => jwtDecode<TokenClaims>(token);

interface AuthState {
  currentUser: CurrentUser | null;
  login: (username: string, password: string) => Promise<boolean>;
  /**
   * Drop the token and the current user, and publish `login` as false — which is
   * what the session teardown (`services/session-reset` and its engine half,
   * `services/engine-reset`) hangs off.
   */
  logout: () => Promise<void>;
  /**
   * Change one's own password, proving identity with the current one.
   *
   * Runs while signed out and sends no token: the server authorises it on the
   * current password alone, and rate limits it alongside sign-in. It does not
   * open a session — the new password is what signs the user in afterwards.
   */
  resetPassword: (
    username: string,
    currentPassword: string,
    newPassword: string,
  ) => Promise<boolean>;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
  isTokenExpired: (token: string) => boolean;
  /** Rebuild `currentUser` from the stored token, if there is one. */
  setCurrentUser: () => void;
  /** Sign out if the stored token has expired. Reports whether it did. */
  checkTokenAndLogoutIfExpired: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,

  async login(username, password) {
    try {
      const response = await apiFetch("login/signin", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) return false;

      writeAuthToken(await response.json());
      set({ currentUser: { username, isAdmin: get().isAdmin() } });
      useLogStore.getState().log(`User ${username} logged in`, "info");
      // Announce the new session. Nothing rebuilds itself off this — `LeftNav`
      // reloads from the server when the body mounts for the new `currentUser` —
      // so it is the sign-out publish below that carries the weight.
      eventBus.publish("login", true);
      return true;
    } catch (error) {
      console.error("There was an error logging in:", error);
      throw error;
    }
  },

  async logout() {
    try {
      const token = readAuthToken();
      await apiFetch("login/signout", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      clearAuthToken();
      set({ currentUser: null });
      // Publish BEFORE logging: the store teardown clears the log panel (it
      // names the objects the departing user opened), so a line written first
      // would be wiped. Listeners run synchronously, so the store half of the
      // teardown has completed by the time this call returns.
      eventBus.publish("login", false);
      useLogStore.getState().log("User logged out", "info");
    } catch (error) {
      console.error("There was an error logging out:", error);
      throw error;
    }
  },

  async resetPassword(username, currentPassword, newPassword) {
    try {
      const response = await apiFetch("login/password", {
        method: "POST",
        body: JSON.stringify({
          username,
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      if (!response.ok) {
        // The server distinguishes a wrong current password (401) from a new one
        // it will not accept (400), so its own message is the one worth showing.
        useLogStore.getState().log(await errorMessageOf(response), "error");
        return false;
      }

      useLogStore.getState().log(`Password reset for ${username}`, "info");
      return true;
    } catch (error) {
      console.error("There was an error resetting the password:", error);
      throw error;
    }
  },

  isAuthenticated() {
    return readAuthToken() !== null;
  },

  isAdmin() {
    const token = readAuthToken();
    return token ? decodeToken(token).isAdmin === true : false;
  },

  setCurrentUser() {
    const token = readAuthToken();
    if (!token) return;
    set({
      currentUser: {
        username: decodeToken(token).username ?? "",
        isAdmin: get().isAdmin(),
      },
    });
  },

  isTokenExpired(token) {
    const { exp } = decodeToken(token);
    // A token that does not say when it expires is treated as expired.
    if (!exp) return true;
    return new Date(exp * 1000) < new Date();
  },

  checkTokenAndLogoutIfExpired() {
    const token = readAuthToken();
    if (token && get().isTokenExpired(token)) {
      void get().logout();
      return true;
    }
    return false;
  },
}));

// Restore the session from a token left behind by an earlier visit.
useAuthStore.getState().setCurrentUser();
