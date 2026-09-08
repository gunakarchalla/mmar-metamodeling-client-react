import { describe, it, expect } from "vitest";
import { vizRepIcon, vizRepIconOf } from "./vizrep-icon";

describe("vizRepIcon", () => {
  it("returns the placeholder when the VizRep is empty", () => {
    expect(vizRepIcon("").startsWith("data:image/png;base64,")).toBe(true);
  });

  it("extracts the data url bound to `icon`", () => {
    const vizRep = "function r(){ let icon = 'data:image/png;base64,ABC123'; }";
    expect(vizRepIcon(vizRep)).toBe("data:image/png;base64,ABC123");
  });

  it("falls back to the data url bound to `map` when there is no icon", () => {
    const vizRep = "function r(){ let map = 'data:image/png;base64,MAPDATA'; }";
    expect(vizRepIcon(vizRep)).toBe("data:image/png;base64,MAPDATA");
  });

  it("prefers the icon over the map when both are present", () => {
    const vizRep =
      "function r(){ let icon = 'data:image/png;base64,ICON'; let map = 'data:image/png;base64,MAP'; }";
    expect(vizRepIcon(vizRep)).toBe("data:image/png;base64,ICON");
  });

  it("uses the placeholder for an icon loaded from the server at draw time", () => {
    const vizRep = "function r(){ let icon = await gc.getImageByUUID('some-uuid'); }";
    expect(vizRepIcon(vizRep).startsWith("data:image/png;base64,")).toBe(true);
  });

  it("returns an empty string when neither binding holds an image", () => {
    expect(vizRepIcon("function r(){ let map = someVariable; }")).toBe("");
  });
});

/**
 * The cached entry point. Its whole reason to exist is that lists re-render far
 * more often than a VizRep changes, so the risk it carries is the mirror image:
 * an icon that keeps showing the source the object *used* to have.
 */
describe("vizRepIconOf — the cached form", () => {
  const ICON = "function r(){ let icon = 'data:image/png;base64,ICON'; }";
  const OTHER = "function r(){ let icon = 'data:image/png;base64,OTHER'; }";

  it("agrees with the uncached function, and does so repeatedly", () => {
    expect(vizRepIconOf(ICON)).toBe(vizRepIcon(ICON));
    expect(vizRepIconOf(ICON)).toBe(vizRepIcon(ICON));
  });

  it("tracks an edited VizRep rather than serving the previous icon", () => {
    expect(vizRepIconOf(ICON)).toBe("data:image/png;base64,ICON");
    expect(vizRepIconOf(OTHER)).toBe("data:image/png;base64,OTHER");
  });

  it("caches per value, so two objects with different VizReps do not collide", () => {
    // The identity path: gds types `geometry` as a Function, so this is the
    // shape the callers actually pass.
    const a = () => ICON;
    const b = () => OTHER;
    a.toString = () => ICON;
    b.toString = () => OTHER;
    expect(vizRepIconOf(a)).toBe("data:image/png;base64,ICON");
    expect(vizRepIconOf(b)).toBe("data:image/png;base64,OTHER");
    expect(vizRepIconOf(a)).toBe("data:image/png;base64,ICON");
  });

  it("treats a missing VizRep as the placeholder, as the uncached form does", () => {
    expect(vizRepIconOf(undefined)).toBe(vizRepIcon(""));
    expect(vizRepIconOf(null)).toBe(vizRepIcon(""));
  });
});
