/**
 * Which modifier key means "command" here: ⌘ on macOS, Ctrl on Windows/Linux.
 *
 * Detection deliberately mirrors Monaco's own (`vs/base/common/platform.js`
 * tests the user agent for a "Macintosh" substring, and `KeyMod.CtrlCmd` decodes
 * to metaKey on macOS / ctrlKey elsewhere). The code editor binds its shortcuts
 * through `CtrlCmd` while the rest of the app binds them on `window`, so the two
 * must agree about the platform or one of them would obey the wrong key.
 */
export function isMacPlatform(): boolean {
  return typeof navigator !== "undefined" && navigator.userAgent.indexOf("Macintosh") >= 0;
}

/**
 * True when a keyboard event carries the platform's command modifier. Read at
 * call time rather than memoized at import: it is trivial to compute, and this
 * keeps it correct (and stubbable) regardless of import order.
 */
export function hasCommandModifier(event: Pick<KeyboardEvent, "ctrlKey" | "metaKey">): boolean {
  return isMacPlatform() ? event.metaKey : event.ctrlKey;
}
