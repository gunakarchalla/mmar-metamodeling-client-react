/**
 * Extraction of a list icon from a meta object's VizRep source.
 *
 * A VizRep is JavaScript the user authors to draw the object in 3D. Lists and
 * tables cannot run it, so they show a still image instead, taken from the two
 * conventional bindings a VizRep uses for its texture:
 *
 *   let icon = 'data:image/png;base64,…';   // dedicated 2D icon, preferred
 *   let map  = 'data:image/png;base64,…';   // 3D material texture, fallback
 *
 * Anything else — an icon loaded from the server at runtime, a VizRep with
 * neither binding — has no image available without executing the code, so the
 * placeholder below stands in.
 */

/** Neutral grey tile shown when a VizRep carries no usable inline image. */
const PLACEHOLDER_ICON =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAQAAAD9CzEMAAAAdElEQVRYw+2SwQ2AIBAEpwC6oSdqoii6oQD8+DHBAOdpNO7sCx7MbgII8SSBRKGQCP6PRzKVtqeSib69WycOW469ezFvOe/tsGXc27xlrffiFlvvhS3NORJIIMFbBLNIIMGfBKN7Ce4XfPcXzZ4luCYQwsoGpwTEXjWPD4EAAAAASUVORK5CYII=";

/**
 * The image to show for `geometry` (a VizRep source string).
 *
 * Returns a data URL, or an empty string when the source defines a `map` binding
 * that holds no inline image — the callers render that as "no image".
 */
export function vizRepIcon(geometry: string): string {
  if (!geometry) return PLACEHOLDER_ICON;

  // Single-quoted literals of the `let icon = …` binding, in source order.
  const iconSection = geometry.split("let icon")[1];
  if (iconSection) {
    let afterRemoteLookup = false;
    for (const literal of iconSection.split("'")) {
      if (literal.startsWith("data")) return literal;
      if (literal.endsWith("getImageByUUID(")) {
        // The icon is fetched from the server at draw time; its argument (the
        // next literal) is a UUID, not an image.
        afterRemoteLookup = true;
      } else if (afterRemoteLookup) {
        return PLACEHOLDER_ICON;
      }
    }
  }

  // No inline icon: fall back to the material texture. The last `data:` literal
  // wins, so a VizRep that reassigns `map` shows the texture it ends up using.
  const mapSection = geometry.split("let map")[1];
  let map = "";
  if (mapSection) {
    for (const literal of mapSection.split("'")) {
      if (literal.startsWith("data")) map = literal;
    }
  }
  return map;
}

/**
 * The cached form, and the one every list and table should call.
 *
 * The parse above is not cheap — it splits a source string that routinely embeds
 * a multi-kilobyte base64 texture, three times — and `geometry` is typed as a
 * `Function` by the shared data structures, so each caller also allocated a
 * fresh copy of that whole string via `toString()` just to hand it over. Rows
 * re-render far more often than their VizRep changes (any commit republishes the
 * store), so both costs were being paid over and over for an answer that had not
 * moved.
 *
 * Keying on the geometry value's *identity* rather than on its text is what
 * makes that safe and cheap: a VizRep the user edits arrives as a new value and
 * misses the cache, so the icon still tracks the source.
 */
const byIdentity = new WeakMap<object, string>();
const byText = new Map<string, string>();

/** Bounds `byText`, which cannot evict on its own the way a WeakMap does. */
const MAX_TEXT_ENTRIES = 500;

export function vizRepIconOf(geometry: unknown): string {
  if (geometry === null || geometry === undefined) return PLACEHOLDER_ICON;

  // The common case: gds hands over a Function (or an object wrapping one), so
  // the entry is collected with the object and needs no bookkeeping.
  if (typeof geometry === "object" || typeof geometry === "function") {
    const key = geometry as object;
    const hit = byIdentity.get(key);
    if (hit !== undefined) return hit;
    const icon = vizRepIcon(String(geometry));
    byIdentity.set(key, icon);
    return icon;
  }

  const text = String(geometry);
  const hit = byText.get(text);
  if (hit !== undefined) return hit;
  const icon = vizRepIcon(text);
  // Plain FIFO eviction: this only exists to stop a long session accumulating
  // every VizRep ever displayed, and the working set is one screen of rows.
  if (byText.size >= MAX_TEXT_ENTRIES) {
    byText.delete(byText.keys().next().value as string);
  }
  byText.set(text, icon);
  return icon;
}
