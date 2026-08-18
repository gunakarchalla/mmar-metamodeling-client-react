import { create } from "zustand";
import { jwtDecode } from "jwt-decode";
import { apiFetch } from "@/resources/services/api";
import { clearAuthToken, readAuthToken, writeAuthToken } from "@/resources/services/auth-token";
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
  logout: () => Promise<void>;
  signup: (username: string, password: string) => Promise<boolean>;
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
      useLogStore.getState().log("User logged out", "info");
    } catch (error) {
      console.error("There was an error logging out:", error);
      throw error;
    }
  },

  async signup(username, password) {
    try {
      const response = await apiFetch("login/signup", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) return false;

      writeAuthToken((await response.json()).token);
      return true;
    } catch (error) {
      console.error("There was an error signing up:", error);
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
