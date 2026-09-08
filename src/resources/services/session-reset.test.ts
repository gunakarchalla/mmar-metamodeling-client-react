// session-reset: signing out must leave nothing of the previous user's session
// behind, because the next sign-in re-renders the SAME store singletons —
// `AppLayout` only stops rendering the body while nobody is signed in. The
// regression this guards is a second user inheriting the first user's loaded
// metamodel, their open editor tabs (unsaved edits and undo history included)
// and their log panel.
//
// Nothing is mocked: the store half of the teardown touches only zustand stores,
// which is exactly why it is separate from the engine half (see the module).
import { describe, it, expect, beforeEach } from "vitest";
import { SceneType } from "@gds/models/meta/Metamodel_scenetypes.structure";
import { Class } from "@gds/models/meta/Metamodel_classes.structure";

import { resetSessionState } from "./session-reset";
import { eventBus } from "./event-bus";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { useEditorStore, DEFAULT_VIZREP_CODE } from "@/resources/store/editorStore";
import { useLogStore } from "@/resources/store/logStore";

/**
 * `editorStore` and `logStore` are kept byte-identical with the sibling vizrep
 * client and so have no `reset()` of their own — `resetSessionState` is the only
 * thing that puts them back, which is exactly what these tests exercise.
 */

const store = () => useSelectedObjectStore.getState();

/** Put the app in the state "user A had two scene types open, one of them edited". */
function seedSession() {
  store().setObjects(
    [
      SceneType.fromJS({ uuid: "st-1", name: "Alpha" }) as SceneType,
      SceneType.fromJS({ uuid: "st-2", name: "Beta" }) as SceneType,
    ],
    "SceneType",
  );
  store().setObjects([new Class("cl-1", "AClass", "" as never, null as never)], "Class");
  store().setSelectedObject("st-1");
  store().setSelectedObject("st-2");
  // Makes the active tab dirty and records an undo step on it.
  store().updateSelectedField("name", "Beta (edited)");

  useEditorStore.getState().setCode("async function vizRep(gc) { /* user A */ }");
  useEditorStore.getState().setThreeDimensional(false);
  useEditorStore.getState().setReadyForVizRepUpdate(false);

  useLogStore.getState().log("Scene type Alpha opened", "info");
}

beforeEach(() => {
  resetSessionState();
  seedSession();
});

describe("resetSessionState", () => {
  it("empties every loaded collection", () => {
    expect(store().sceneTypes).toHaveLength(2);

    resetSessionState();

    expect(store().sceneTypes).toEqual([]);
    expect(store().classes).toEqual([]);
    // The index behind getTypeFromUuid answers from the collections, so it must
    // have gone with them rather than still resolving user A's uuids.
    expect(store().getTypeFromUuid("st-1")).toBeNull();
  });

  it("closes every editor tab, unsaved edits and undo history included", () => {
    expect(store().openTabs).toHaveLength(2);
    expect(store().hasUnsavedTabs()).toBe(true);

    resetSessionState();

    expect(store().openTabs).toEqual([]);
    expect(store().activeTabUuid).toBeNull();
    expect(store().hasUnsavedTabs()).toBe(false);
  });

  it("drops the selection", () => {
    resetSessionState();

    expect(store().selectedObject).toBeNull();
    expect(store().type).toBeNull();
    expect(store().selectedTab).toBeUndefined();
  });

  it("puts the code editor back to its placeholder", () => {
    // The editor renders its buffer whether or not anything is selected, so this
    // is the one piece of the previous user's work a signed-out app still shows.
    resetSessionState();

    expect(useEditorStore.getState().codeEditorValue).toBe(DEFAULT_VIZREP_CODE);
    expect(useEditorStore.getState().threeDimensional).toBe(true);
    // The live-preview lock: left held, the next session's preview would hang.
    expect(useEditorStore.getState().readyForVizRepUpdate).toBe(true);
  });

  it("clears the log panel", () => {
    expect(useLogStore.getState().logArray).not.toEqual([]);

    resetSessionState();

    expect(useLogStore.getState().logArray).toEqual([]);
    expect(useLogStore.getState().snackbar.open).toBe(false);
  });

  it("is idempotent on an already-empty session", () => {
    resetSessionState();
    expect(() => resetSessionState()).not.toThrow();
    expect(store().openTabs).toEqual([]);
  });
});

describe("the login channel", () => {
  it("runs the teardown on sign-out", () => {
    eventBus.publish("login", false);

    expect(store().sceneTypes).toEqual([]);
    expect(store().openTabs).toEqual([]);
    expect(useLogStore.getState().logArray).toEqual([]);
  });

  it("leaves the session alone on sign-in, which happens after the teardown", () => {
    eventBus.publish("login", true);

    expect(store().sceneTypes).toHaveLength(2);
    expect(store().openTabs).toHaveLength(2);
  });
});
