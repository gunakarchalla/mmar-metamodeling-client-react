import { create } from "zustand";
import { jwtDecode } from "jwt-decode";
import { apiFetch } from "@/resources/services/api";
import { useLogStore } from "./logStore";

export interface CurrentUser {
  username: string;
  isAdmin: boolean;
}

// localStorage is guarded so the store can also be imported in a non-DOM
// (node/vitest) context without throwing at module-load time. In the browser
// this behaves exactly like the original `localStorage["auth_token"]` usage.
function getToken(): string | null {
  try {
    return localStorage.getItem("auth_token");
  } catch {
    return null;
  }
}

function setToken(token: string): void {
  try {
    localStorage.setItem("auth_token", token);
  } catch {
    /* no-op outside the browser */
  }
}

function removeToken(): void {
  try {
    localStorage.removeItem("auth_token");
  } catch {
    /* no-op outside the browser */
  }
}

interface AuthState {
  currentUser: CurrentUser | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  signup: (username: string, password: string) => Promise<boolean>;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
  isTokenExpired: (token: string) => boolean;
  setCurrentUser: () => void;
  checkTokenAndLogoutIfExpired: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,

  async login(username: string, password: string): Promise<boolean> {
    try {
      const response = await apiFetch("login/signin", {
        method: "POST",
        body: JSON.stringify({ username: username, password: password }),
      });

      if (!response.ok) return false;
      useLogStore.getState().log(`User ${username} logged in`, "info");
      const data = await response.json();
      // Save the token for future requests
      setToken(data);
      set({
        currentUser: {
          username: username,
          isAdmin: get().isAdmin(),
        },
      });
      return true;
    } catch (error) {
      console.error("There was an error logging in:", error);
      throw error;
    }
  },

  async logout(): Promise<void> {
    try {
      const token = getToken();
      await apiFetch("login/signout", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      removeToken();
      set({ currentUser: null });
      useLogStore.getState().log("User logged out", "info");
    } catch (error) {
      console.error("There was an error logging out:", error);
      throw error;
    }
  },

  async signup(username: string, password: string): Promise<boolean> {
    try {
      const response = await apiFetch("login/signup", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) return false;
      const data = await response.json();
      // Save the token for future requests, for example:
      setToken(data.token);
      return true;
    } catch (error) {
      console.error("There was an error signing up:", error);
      throw error;
    }
  },

  isAuthenticated(): boolean {
    return getToken() !== null;
  },

  isAdmin(): boolean {
    if (!get().isAuthenticated()) return false;
    const token = getToken() as string;
    const decoded = jwtDecode(token);
    // @ts-ignore
    return decoded.isAdmin === true;
  },

  setCurrentUser(): void {
    const token = getToken();
    if (token) {
      set({
        currentUser: {
          // @ts-ignore
          username: jwtDecode(token).username,
          isAdmin: get().isAdmin(),
        },
      });
    }
  },

  isTokenExpired(token: string): boolean {
    const decoded = jwtDecode(token);
    if (!decoded.exp) return true; // If there's no expiration date in the token, consider it expired
    const expDate = new Date(decoded.exp * 1000);
    return expDate < new Date();
  },

  checkTokenAndLogoutIfExpired(): boolean {
    const token = getToken();
    if (token && get().isTokenExpired(token)) {
      get().logout();
      return true;
    }
    return false;
  },
}));

// Mirror the original UserService constructor: hydrate currentUser from a stored token.
useAuthStore.getState().setCurrentUser();
