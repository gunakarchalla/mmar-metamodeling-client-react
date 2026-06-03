import { describe, it, expect, beforeEach } from "vitest";
import { useSelectedObjectStore } from "./selectedObjectStore";
import { SceneType } from "@gds/models/meta/Metamodel_scenetypes.structure";

const reset = () => useSelectedObjectStore.getState().resetObjects();

describe("selectedObjectStore.getIcon", () => {
  beforeEach(reset);

  it("returns the default png data-url when vizRep is empty", () => {
    const icon = useSelectedObjectStore.getState().getIcon("");
    expect(icon.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("extracts the data-url defined after 'let icon'", () => {
    const vizRep = "function r(){ let icon = 'data:image/png;base64,ABC123'; }";
    const icon = useSelectedObjectStore.getState().getIcon(vizRep);
    expect(icon).toBe("data:image/png;base64,ABC123");
  });

  it("falls back to a data-url defined after 'let map' when no icon", () => {
    const vizRep = "function r(){ let map = 'data:image/png;base64,MAPDATA'; }";
    const icon = useSelectedObjectStore.getState().getIcon(vizRep);
    expect(icon).toBe("data:image/png;base64,MAPDATA");
  });
});

describe("selectedObjectStore.getTypeFromUuid round-trip", () => {
  beforeEach(reset);

  it("resolves the type for a uuid present in a collection", () => {
    const store = useSelectedObjectStore.getState();
    const st = SceneType.fromJS({ uuid: "abc-123", name: "Test" }) as SceneType;
    store.setSceneTypes([st]);
    expect(store.getTypeFromUuid("abc-123")).toBe("SceneType");
    expect(store.getObjectFromUuid("abc-123")).toBe(st);
  });

  it("returns null for an unknown uuid", () => {
    expect(useSelectedObjectStore.getState().getTypeFromUuid("nope")).toBeNull();
  });
});
