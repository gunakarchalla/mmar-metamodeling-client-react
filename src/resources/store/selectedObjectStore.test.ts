import { describe, it, expect, beforeEach } from "vitest";
import { selectCanRedo, selectCanUndo, useSelectedObjectStore } from "./selectedObjectStore";
import { SceneType } from "@gds/models/meta/Metamodel_scenetypes.structure";
import { Class } from "@gds/models/meta/Metamodel_classes.structure";
import { useEditorStore } from "./editorStore";

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

describe("selectedObjectStore open tabs", () => {
  const store = () => useSelectedObjectStore.getState();

  beforeEach(() => {
    reset();
    store().setSceneTypes([
      SceneType.fromJS({ uuid: "st-1", name: "One" }) as SceneType,
      SceneType.fromJS({ uuid: "st-2", name: "Two" }) as SceneType,
      SceneType.fromJS({ uuid: "st-3", name: "Three" }) as SceneType,
    ]);
  });

  it("opens one tab per object and activates the newest", () => {
    store().setSelectedObject("st-1");
    store().setSelectedObject("st-2");
    expect(store().openTabs.map((t) => t.uuid)).toEqual(["st-1", "st-2"]);
    expect(store().activeTabUuid).toBe("st-2");
    expect(store().selectedObject?.uuid).toBe("st-2");
  });

  it("focuses an already-open tab instead of opening a duplicate", () => {
    store().setSelectedObject("st-1");
    store().setSelectedObject("st-2");
    store().setSelectedObject("st-1");
    expect(store().openTabs).toHaveLength(2);
    expect(store().activeTabUuid).toBe("st-1");
  });

  it("keeps each tab's unsaved working copy when switching away and back", () => {
    store().setSelectedObject("st-1");
    store().updateSelectedField("name", "edited");
    store().setSelectedObject("st-2");
    // the other tab is untouched...
    expect(store().selectedObject?.name).toBe("Two");
    store().setSelectedObject("st-1");
    // ...and the edit survived the round trip
    expect(store().selectedObject?.name).toBe("edited");
    // the collection still holds the unedited object (working copy is decoupled)
    expect(store().getObjectFromUuid("st-1")?.name).toBe("One");
  });

  it("flags an edited tab dirty and markTabClean clears it", () => {
    store().setSelectedObject("st-1");
    expect(store().getTab("st-1")?.dirty).toBe(false);
    store().updateSelectedField("name", "edited");
    expect(store().getTab("st-1")?.dirty).toBe(true);
    store().markTabClean("st-1");
    expect(store().getTab("st-1")?.dirty).toBe(false);
  });

  it("only dirties the active tab", () => {
    store().setSelectedObject("st-1");
    store().setSelectedObject("st-2");
    store().updateSelectedField("name", "edited");
    expect(store().getTab("st-1")?.dirty).toBe(false);
    expect(store().getTab("st-2")?.dirty).toBe(true);
  });

  it("remembers the sub-tab per open tab", () => {
    store().setSelectedObject("st-1");
    store().setSelectedTab("Classes");
    store().setSelectedObject("st-2");
    expect(store().selectedTab).toBe("General");
    store().setSelectedObject("st-1");
    expect(store().selectedTab).toBe("Classes");
  });

  it("closing the active tab focuses its right-hand neighbour", () => {
    store().setSelectedObject("st-1");
    store().setSelectedObject("st-2");
    store().setSelectedObject("st-3");
    store().activateTab("st-2");
    store().closeTab("st-2");
    expect(store().openTabs.map((t) => t.uuid)).toEqual(["st-1", "st-3"]);
    expect(store().activeTabUuid).toBe("st-3");
  });

  it("closing the last tab falls back to the tab on its left", () => {
    store().setSelectedObject("st-1");
    store().setSelectedObject("st-2");
    store().closeTab("st-2");
    expect(store().activeTabUuid).toBe("st-1");
    expect(store().selectedObject?.uuid).toBe("st-1");
  });

  it("closing a background tab leaves the selection alone", () => {
    store().setSelectedObject("st-1");
    store().setSelectedObject("st-2");
    store().closeTab("st-1");
    expect(store().activeTabUuid).toBe("st-2");
    expect(store().selectedObject?.uuid).toBe("st-2");
  });

  it("closing the only tab clears the selection", () => {
    store().setSelectedObject("st-1");
    store().closeTab("st-1");
    expect(store().openTabs).toHaveLength(0);
    expect(store().activeTabUuid).toBeNull();
    expect(store().selectedObject).toBeNull();
    expect(store().type).toBeNull();
  });

  it("removing an object closes its tab", () => {
    store().setSelectedObject("st-1");
    store().setSelectedObject("st-2");
    store().removeObject("st-2");
    expect(store().openTabs.map((t) => t.uuid)).toEqual(["st-1"]);
    expect(store().activeTabUuid).toBe("st-1");
  });

  it("hasUnsavedTabs reflects whether any open tab is dirty", () => {
    store().setSelectedObject("st-1");
    store().setSelectedObject("st-2");
    expect(store().hasUnsavedTabs()).toBe(false);
    store().updateSelectedField("name", "edited");
    expect(store().hasUnsavedTabs()).toBe(true);
    store().markTabClean("st-2");
    expect(store().hasUnsavedTabs()).toBe(false);
  });

  it("a full reset closes every tab", () => {
    store().setSelectedObject("st-1");
    store().setSelectedObject("st-2");
    store().resetObjects();
    expect(store().openTabs).toHaveLength(0);
    expect(store().selectedObject).toBeNull();
  });
});

describe("selectedObjectStore undo/redo", () => {
  const store = () => useSelectedObjectStore.getState();
  const canUndo = () => selectCanUndo(useSelectedObjectStore.getState());
  const canRedo = () => selectCanRedo(useSelectedObjectStore.getState());

  beforeEach(() => {
    reset();
    store().setSceneTypes([
      SceneType.fromJS({ uuid: "st-1", name: "One" }) as SceneType,
      SceneType.fromJS({ uuid: "st-2", name: "Two" }) as SceneType,
    ]);
    store().setClasses([Class.fromJS({ uuid: "cl-1", name: "Klass" }) as Class]);
  });

  it("has nothing to undo on a freshly opened tab", () => {
    store().setSelectedObject("st-1");
    expect(canUndo()).toBe(false);
    expect(canRedo()).toBe(false);
    store().undo();
    expect(store().selectedObject?.name).toBe("One");
  });

  it("undoes a field edit and redoes it", () => {
    store().setSelectedObject("st-1");
    store().updateSelectedField("name", "edited");
    expect(canUndo()).toBe(true);

    store().undo();
    expect(store().selectedObject?.name).toBe("One");
    expect(canUndo()).toBe(false);
    expect(canRedo()).toBe(true);

    store().redo();
    expect(store().selectedObject?.name).toBe("edited");
    expect(canRedo()).toBe(false);
  });

  it("collapses a run of keystrokes in one field into a single step", () => {
    store().setSelectedObject("st-1");
    for (const value of ["O", "On", "Onc", "Once"]) {
      store().updateSelectedField("name", value);
    }
    store().undo();
    expect(store().selectedObject?.name).toBe("One");
    expect(canUndo()).toBe(false);
  });

  it("keeps edits to different fields as separate steps", () => {
    store().setSelectedObject("st-1");
    store().updateSelectedField("name", "renamed");
    store().updateSelectedField("description", "described");

    store().undo();
    expect(store().selectedObject?.description).not.toBe("described");
    expect(store().selectedObject?.name).toBe("renamed");
    store().undo();
    expect(store().selectedObject?.name).toBe("One");
  });

  // The reason snapshots are deep clones: `classes` is mutated in place, so a
  // shallow snapshot would share the array being edited and restore nothing.
  it("undoes a structural child change", () => {
    store().setSelectedObject("st-1");
    store().addChild("cl-1", "Class");
    expect((store().selectedObject as SceneType).classes).toHaveLength(1);

    store().undo();
    expect((store().selectedObject as SceneType).classes).toHaveLength(0);
    store().redo();
    expect((store().selectedObject as SceneType).classes).toHaveLength(1);
  });

  it("keeps a separate history per tab and steps only the active one", () => {
    store().setSelectedObject("st-1");
    store().updateSelectedField("name", "one edited");
    store().setSelectedObject("st-2");
    store().updateSelectedField("name", "two edited");

    // undo on st-2 leaves st-1's edit alone
    store().undo();
    expect(store().selectedObject?.name).toBe("Two");
    expect(store().getTab("st-1")?.object.name).toBe("one edited");

    store().setSelectedObject("st-1");
    expect(canRedo()).toBe(false); // st-1 has its own, un-undone history
    store().undo();
    expect(store().selectedObject?.name).toBe("One");
  });

  it("undoing back to the saved state makes the tab clean again", () => {
    store().setSelectedObject("st-1");
    store().updateSelectedField("name", "edited");
    expect(store().getTab("st-1")?.dirty).toBe(true);

    store().undo();
    expect(store().getTab("st-1")?.dirty).toBe(false);
    store().redo();
    expect(store().getTab("st-1")?.dirty).toBe(true);
  });

  it("treats the last save as the new clean point", () => {
    store().setSelectedObject("st-1");
    store().updateSelectedField("name", "saved name");
    store().markTabClean("st-1");
    store().updateSelectedField("description", "later edit");
    expect(store().getTab("st-1")?.dirty).toBe(true);

    store().undo();
    expect(store().selectedObject?.name).toBe("saved name");
    expect(store().getTab("st-1")?.dirty).toBe(false);
  });

  it("drops the redo branch once a new edit lands", () => {
    store().setSelectedObject("st-1");
    store().updateSelectedField("name", "first");
    store().undo();
    expect(canRedo()).toBe(true);

    store().updateSelectedField("name", "second");
    expect(canRedo()).toBe(false);
    store().undo();
    expect(store().selectedObject?.name).toBe("One");
  });

  // A restored snapshot is handed out as a clone; if it were not, the next edit
  // would mutate the stored entry and undoing again would return the new value.
  it("does not let a post-undo edit corrupt the snapshot it came from", () => {
    store().setSelectedObject("st-1");
    store().updateSelectedField("name", "first");
    store().undo();
    store().updateSelectedField("description", "added later");
    store().undo();
    expect(store().selectedObject?.name).toBe("One");
    expect(store().selectedObject?.description).not.toBe("added later");
  });

  // The Monaco buffer is a second mirror of `geometry`, so a step that changes
  // the geometry has to move it too — and a step that does not must leave the
  // (beautified, D8) buffer exactly as the user sees it.
  it("pushes a restored geometry into the editor buffer, and only then", () => {
    store().setClasses([
      Class.fromJS({ uuid: "cl-2", name: "Drawn", geometry: "original()" }) as Class,
    ]);
    store().setSelectedObject("cl-2");
    useEditorStore.getState().setCode("beautified original()");

    store().updateSelectedField("name", "renamed");
    store().undo();
    expect(useEditorStore.getState().codeEditorValue).toBe("beautified original()");

    store().updateSelectedField("geometry", "edited()");
    store().undo();
    expect(useEditorStore.getState().codeEditorValue).toBe("original()");
    store().redo();
    expect(useEditorStore.getState().codeEditorValue).toBe("edited()");
  });

  it("closing a tab discards its history", () => {
    store().setSelectedObject("st-1");
    store().updateSelectedField("name", "edited");
    store().closeTab("st-1");
    expect(canUndo()).toBe(false);

    store().setSelectedObject("st-1");
    expect(canUndo()).toBe(false);
  });
});
