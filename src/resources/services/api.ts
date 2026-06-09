import { API_URL } from "@/config";

/**
 * Small fetch wrapper replacing the Aurelia HttpClient configuration.
 * Prefixes API_URL and merges the same default headers the original client used.
 * Sets Content-Type: application/json for requests with a body (matching the
 * original Aurelia HttpClient) so the server's express.json() parses req.body;
 * callers add Authorization.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Requested-With": "Fetch",
    ...(init.body != null ? { "Content-Type": "application/json" } : {}),
    ...((init.headers as Record<string, string>) ?? {}),
  };
  return fetch(`${API_URL}/${path}`, {
    credentials: "same-origin",
    ...init,
    headers,
  });
}
