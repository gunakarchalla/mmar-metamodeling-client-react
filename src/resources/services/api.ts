import { API_URL } from "@/config";

/**
 * Small fetch wrapper replacing the Aurelia HttpClient configuration.
 * Prefixes API_URL and merges the same default headers the original client used.
 * Sets Content-Type: application/json for requests with a JSON body (matching the
 * original Aurelia HttpClient) so the server's express.json() parses req.body;
 * callers add Authorization. For FormData (multipart file uploads) we must NOT
 * set Content-Type — the browser sets it together with the multipart boundary,
 * which multer needs to parse the upload.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const isFormData = init.body instanceof FormData;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Requested-With": "Fetch",
    ...(init.body != null && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...((init.headers as Record<string, string>) ?? {}),
  };
  return fetch(`${API_URL}/${path}`, {
    credentials: "same-origin",
    ...init,
    headers,
  });
}

/**
 * The message out of a failed response, for showing to the user.
 *
 * The server answers every refusal as `{"error": "..."}`. Eight metamodel delete
 * endpoints used to answer the bare message instead — a 409 naming the object
 * that blocks the deletion is the one a user actually reads — so the raw body
 * was good enough to log verbatim. It is not any more: the envelope would reach
 * the log window as `{"error":"Cannot delete ..."}`.
 *
 * Falls back to the raw text for a response that is not JSON, or not the
 * envelope, which is what the raw-body file endpoints return.
 */
export async function errorMessageOf(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const body: unknown = JSON.parse(text);
    if (typeof body === "string") return body;
    if (body && typeof body === "object" && typeof (body as { error?: unknown }).error === "string") {
      return (body as { error: string }).error;
    }
  } catch {
    // Not JSON; the raw text is the best there is.
  }
  return text;
}
