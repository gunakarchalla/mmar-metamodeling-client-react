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
