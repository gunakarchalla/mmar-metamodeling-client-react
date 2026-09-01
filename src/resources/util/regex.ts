/**
 * The attribute type's RegEx field is free text, so a pattern is sometimes entered
 * as a JavaScript literal (`/^x$/gim`) or with a stray leading slash left over from
 * one. Fed straight to `new RegExp` those slashes become literal characters no
 * value can ever match, so every default value and every instance is refused.
 * `unwrapRegexLiteral` strips that wrapper back to the bare pattern.
 *
 * Kept in step with the identical helper on the server
 * (mmar-server/.../Instance_attributes.rules.ts) and in the modeling client
 * (mmar-modeling-client-react/.../metamodel-constraints.ts) — the three must agree.
 */
export function unwrapRegexLiteral(raw: string): string {
  const pattern = raw.trim();
  // A well-formed literal: /pattern/ or /pattern/flags.
  const literal = pattern.match(/^\/(.+)\/[dgimsuy]*$/);
  if (literal) return literal[1];
  // A literal whose trailing "/flags" was lost, leaving "/^…": a pattern that
  // begins by matching a slash then asserts start-of-line can never hold, so the
  // leading slash is safe to treat as a mistake.
  if (pattern.startsWith("/^")) return pattern.slice(1);
  return pattern;
}
