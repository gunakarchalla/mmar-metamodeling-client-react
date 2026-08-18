import { describe, it, expect } from "vitest";
import { vizRepIcon } from "./vizrep-icon";

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
