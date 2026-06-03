/**
 * Port of the Aurelia `textify` value converter (value_converters.ts).
 * Returns 'text' for empty / null-ish values, otherwise the lowercased string.
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
