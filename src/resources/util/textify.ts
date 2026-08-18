/**
 * Normalise a stored UI-component name for display in a picker.
 *
 * Anything empty or unset — including the strings "null", "undefined" and "not
 * defined" that older records carry — means the default, a plain text input.
 */
export function textify(value: unknown): string {
  return value == null ||
    value === "" ||
    value === "null" ||
    value === "undefined" ||
    value === "not defined"
    ? "text"
    : value.toString().toLowerCase();
}
