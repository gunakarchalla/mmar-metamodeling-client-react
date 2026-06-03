import { API_URL } from "@/config";

/**
 * Small fetch wrapper replacing the Aurelia HttpClient configuration.
 * Prefixes API_URL and merges the same default headers the original client used.
 * Note (faithful to original): no Content-Type is set; callers add Authorization.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Requested-With": "Fetch",
    ...((init.headers as Record<string, string>) ?? {}),
  };
  return fetch(`${API_URL}/${path}`, {
    credentials: "same-origin",
    ...init,
    headers,
  });
}
