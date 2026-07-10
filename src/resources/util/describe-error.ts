/**
 * Render an unknown caught value as a log-safe message.
 *
 * The VizRep preview evaluates user-authored geometry with `new Function(...)`, so a
 * throw can be any value, not just an Error — a SyntaxError from an unparsable
 * snippet, but equally a bare string or object from inside the evaluated code.
 */
export function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err) ?? String(err);
  } catch {
    // Circular / non-serializable payload.
    return String(err);
  }
}
