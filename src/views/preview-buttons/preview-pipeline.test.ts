// Preview edge cases: geometry is committed on every keystroke, so a
// half-typed snippet is the *normal* state of the buffer. `parseObj`/`parseMetaFunction`
// evaluate that snippet with `new Function(...)` and throw on anything unparsable.
//
// Three properties are pinned here:
//   1. an empty or invalid snippet logs an error and returns — it never throws;
//   2. it returns *before* the engine reset, so the canvas keeps the last good preview
//      instead of being wiped by a stray character;
//   3. the Class/RelationClass/Port dispatch keys off the store's `type` string, NOT
//      `instanceof` — the store holds plain objects, never revived class instances.
import { describe, it, expect, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const scene = { add: vi.fn(), getObjectByProperty: vi.fn(() => ({ uuid: "obj3d" })) };
  const globalObject = {
    sceneTypes: [{ uuid: "mock-scene-type" }] as unknown[],
    tabContext: [] as unknown[],
    scene: scene as unknown,
    sceneTree: null as unknown,
    current_class_instance: null as unknown,
    current_port_instance: null as unknown,
    mockClassInstance: {},
    selectedTab: 0,
    render: false,
  };
  // Resolved by hand so a test can hold the engine "not ready" and observe what the
  // selection path does while ThreeCanvas is still mounting.
  let releaseReady: () => void = () => {};
  let ready = Promise.resolve();
  return {
    selected: null as unknown,
    selectedType: null as string | null,
    scene,
    globalObject,
    engine: {
      whenReady: vi.fn(() => ready),
      /** Park every whenReady() awaiter until release() — the "still mounting" state. */
      holdReady() {
        ready = new Promise<void>((resolve) => (releaseReady = resolve));
      },
      release() {
        releaseReady();
      },
      reset() {
        releaseReady();
        ready = Promise.resolve();
      },
    },
    logger: { log: vi.fn() },
    graphicContext: {
      resetInstance: vi.fn(() => Promise.resolve()),
      runVizRepFunction: vi.fn(() => Promise.resolve()),
      drawVizRep: vi.fn(() => Promise.resolve({})),
      drawVizRep_rel: vi.fn(() => Promise.resolve({})),
    },
    instanceCreationHandler: {
      create_UUID: vi.fn(() => "generated-uuid"),
      createClassInstance: vi.fn(() => Promise.resolve({ uuid: "ci" })),
      createRelationclassInstance: vi.fn(() => Promise.resolve({ uuid: "ri" })),
      createPortInstance: vi.fn(() => Promise.resolve({ uuid: "pi" })),
      addPointToClassInstance: vi.fn(),
      addLinePoint: vi.fn(),
      addLastLinePoint: vi.fn(),
    },
    metaUtility: { parseMetaFunction: vi.fn((s: string) => Promise.resolve(s)) },
  };
});

vi.mock("three", () => ({
  Vector3: class {
    constructor(
      public x = 0,
      public y = 0,
      public z = 0,
    ) {}
  },
  Mesh: class {
    position = { x: 0, y: 0, z: 0 };
  },
  SphereGeometry: class {},
  MeshBasicMaterial: class {},
  Scene: class {},
}));
vi.mock("three/examples/jsm/lines/Line2.js", () => ({ Line2: class {} }));

vi.mock("@/engine", () => ({
  engine: mocks.engine,
  globalObject: mocks.globalObject,
  graphicContext: mocks.graphicContext,
  // runPreview nulls globalObject.scene during the reset; the real sceneInit rebuilds it.
  sceneInitiator: {
    sceneInit: vi.fn(() => {
      mocks.globalObject.scene = mocks.scene;
      return Promise.resolve();
    }),
  },
  instanceCreationHandler: mocks.instanceCreationHandler,
  globalSelectedObject: { setObject: vi.fn() },
  lineUpdateService: { setPos: vi.fn() },
}));

vi.mock("@/resources/services/meta-utility", () => ({ metaUtility: mocks.metaUtility }));
vi.mock("@/resources/services/instance-utility", () => ({
  instanceUtility: {
    createTabContextSceneInstance: vi.fn(() => Promise.resolve()),
    getTabContextSceneInstance: vi.fn(() => Promise.resolve({ port_instances: [] })),
  },
}));
vi.mock("@/resources/services/logger", () => ({ logger: mocks.logger }));
vi.mock("@/resources/store/selectedObjectStore", () => ({
  useSelectedObjectStore: {
    getState: () => ({
      getSelectedObject: () => mocks.selected,
      type: mocks.selectedType,
      getObjects: () => [],
    }),
  },
}));

import { runPreview, clearPreview, previewSelectedObject } from "./preview-pipeline";

/**
 * Fixtures in the shape production actually holds. The backend service pushes raw
 * parsed JSON into the store — only scene types and scene instances are ever revived
 * into their classes — so a selected class, relation class or port is a plain object.
 * Building fixtures with `new Class(...)` would hide the reason the pipeline dispatches
 * on the store's `type` tag rather than on `instanceof`.
 */
function selectPlain(type: string, geometry: string) {
  const obj = { uuid: `${type.toLowerCase()}-uuid`, name: "Demo", geometry };
  expect(Object.getPrototypeOf(obj)).toBe(Object.prototype); // guard the guard
  mocks.selected = obj;
  mocks.selectedType = type;
  return obj;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.selected = null;
  mocks.selectedType = null;
  mocks.globalObject.sceneTypes = [{ uuid: "mock-scene-type" }];
  mocks.globalObject.scene = mocks.scene;
  mocks.globalObject.render = false;
  // A test that parked whenReady() must not leave the next one parked forever.
  mocks.engine.reset();
});

describe("runPreview — geometry guards", () => {
  it("logs and returns when nothing is selected", async () => {
    await expect(runPreview()).resolves.toBeUndefined();
    expect(mocks.logger.log).toHaveBeenCalledWith("No object selected to preview", "error");
  });

  it("logs and returns on empty geometry without resetting the engine", async () => {
    selectPlain("Class", "   ");

    await expect(runPreview()).resolves.toBeUndefined();

    expect(mocks.logger.log).toHaveBeenCalledWith("Cannot preview: geometry is empty", "error");
    expect(mocks.graphicContext.resetInstance).not.toHaveBeenCalled();
  });

  it("logs and returns on syntactically invalid geometry — never throws", async () => {
    selectPlain("Class", "function ( { this is not js");

    await expect(runPreview()).resolves.toBeUndefined();

    expect(mocks.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("Cannot preview: geometry is not valid JavaScript"),
      "error",
    );
  });

  it("keeps the last good preview: an invalid snippet resets nothing", async () => {
    // The regression: parsing used to happen *after* resetInstance()/tabContext = [],
    // so one bad character both threw and cleared the canvas.
    selectPlain("Class", "}}} nope");

    await runPreview();

    expect(mocks.graphicContext.resetInstance).not.toHaveBeenCalled();
    expect(mocks.graphicContext.runVizRepFunction).not.toHaveBeenCalled();
  });

  it("propagates a parseMetaFunction failure as a log, not a throw", async () => {
    selectPlain("Class", "() => {}");
    mocks.metaUtility.parseMetaFunction.mockRejectedValueOnce(new Error("bad meta fn"));

    await expect(runPreview()).resolves.toBeUndefined();

    expect(mocks.logger.log).toHaveBeenCalledWith(expect.stringContaining("bad meta fn"), "error");
    expect(mocks.graphicContext.resetInstance).not.toHaveBeenCalled();
  });

  it("compiles valid geometry and proceeds to build the preview", async () => {
    selectPlain("Class", "(gc) => gc");

    await runPreview();

    expect(mocks.metaUtility.parseMetaFunction).toHaveBeenCalledTimes(1);
    expect(mocks.graphicContext.resetInstance).toHaveBeenCalled();
    expect(mocks.graphicContext.runVizRepFunction).toHaveBeenCalledTimes(1);
    expect(mocks.logger.log).not.toHaveBeenCalledWith(
      expect.stringContaining("Cannot preview"),
      "error",
    );
  });
});

describe("runPreview — type dispatch", () => {
  // Before the fix, runPreview branched on `selected instanceof Class` etc. The store
  // never holds gds instances, so ALL three branches fell through to the else and the
  // preview drew nothing for every type — while this suite passed, because its fixtures
  // were real `new Class(...)` objects. These tests pin the dispatch to `store.type`.

  it("previews a plain (non-gds) Class object", async () => {
    selectPlain("Class", "(gc) => gc");

    await runPreview();

    expect(mocks.instanceCreationHandler.createClassInstance).toHaveBeenCalledTimes(1);
    expect(mocks.graphicContext.drawVizRep).toHaveBeenCalledTimes(1);
    expect(mocks.graphicContext.runVizRepFunction).toHaveBeenCalledTimes(1);
    expect(mocks.logger.log).not.toHaveBeenCalledWith(
      "Selected object is not a Class, RelationClass or Port",
      "error",
    );
  });

  it("previews a plain RelationClass object and draws the line", async () => {
    selectPlain("RelationClass", "(gc) => gc");

    await runPreview();

    expect(mocks.instanceCreationHandler.createRelationclassInstance).toHaveBeenCalledTimes(1);
    expect(mocks.graphicContext.drawVizRep_rel).toHaveBeenCalledTimes(1);
    expect(mocks.graphicContext.drawVizRep).not.toHaveBeenCalled();
    // the red + green endpoint spheres
    expect(mocks.scene.add).toHaveBeenCalledTimes(1);
    expect(mocks.scene.add.mock.calls[0]).toHaveLength(2);
  });

  it("previews a plain Port object via the mockClassInstance path", async () => {
    selectPlain("Port", "(gc) => gc");

    await runPreview();

    expect(mocks.instanceCreationHandler.createPortInstance).toHaveBeenCalledTimes(1);
    expect(mocks.graphicContext.drawVizRep).toHaveBeenCalledTimes(1);
  });

  it("rejects a type the preview pipeline does not support", async () => {
    selectPlain("Attribute", "(gc) => gc");

    await expect(runPreview()).resolves.toBeUndefined();

    expect(mocks.logger.log).toHaveBeenCalledWith(
      "Selected object is not a Class, RelationClass or Port",
      "error",
    );
    expect(mocks.graphicContext.runVizRepFunction).not.toHaveBeenCalled();
  });

  it("does not fall back to instanceof: a gds-shaped object with no store type is rejected", async () => {
    // Belt and braces: even an object that *would* satisfy `instanceof Class` must not
    // preview if the store does not classify it, so the block's render condition
    // (GeneralTab, keyed on `type`) and the pipeline can never disagree.
    mocks.selected = { uuid: "x", name: "Demo", geometry: "(gc) => gc" };
    mocks.selectedType = null;

    await runPreview();

    expect(mocks.logger.log).toHaveBeenCalledWith(
      "Selected object is not a Class, RelationClass or Port",
      "error",
    );
  });

  it("bails when the engine has not mounted (no mock SceneType yet)", async () => {
    selectPlain("Class", "(gc) => gc");
    mocks.globalObject.sceneTypes = [];

    await expect(runPreview()).resolves.toBeUndefined();

    expect(mocks.logger.log).toHaveBeenCalledWith(
      "Engine not ready for preview (canvas not mounted)",
      "error",
    );
  });
});

/**
 * The selection path. Before it existed the canvas only ever redrew on a Preview click:
 * the first selection showed an empty canvas, and switching cards left the *previous*
 * object's render on screen while every other field had already moved on.
 */
describe("previewSelectedObject — the canvas follows the selection", () => {
  it("draws the newly selected object", async () => {
    selectPlain("Class", "(gc) => gc");

    await previewSelectedObject();

    expect(mocks.instanceCreationHandler.createClassInstance).toHaveBeenCalledTimes(1);
    expect(mocks.graphicContext.drawVizRep).toHaveBeenCalledTimes(1);
  });

  it("waits for the engine's init before drawing (the initial-selection case)", async () => {
    // ThreeCanvas is a child, so its mount() has started but not settled when the parent
    // publishes. Drawing now would bail out on the missing mock SceneType.
    mocks.engine.holdReady();
    selectPlain("Class", "(gc) => gc");

    const drawn = previewSelectedObject();
    await Promise.resolve();
    expect(mocks.graphicContext.drawVizRep).not.toHaveBeenCalled();

    mocks.engine.release();
    await drawn;
    expect(mocks.graphicContext.drawVizRep).toHaveBeenCalledTimes(1);
  });

  it("clears the canvas when the newly selected object has no geometry", async () => {
    // Distinct from runPreview's "keep the last good preview": that protects a half-typed
    // buffer on the *same* object. Here the empty geometry belongs to a different object,
    // so leaving the previous render up would attribute it to the wrong class.
    selectPlain("Class", "");

    await previewSelectedObject();

    expect(mocks.graphicContext.resetInstance).toHaveBeenCalled();
    expect(mocks.graphicContext.drawVizRep).not.toHaveBeenCalled();
    expect(mocks.globalObject.render).toBe(true);
  });

  it("lets the newest selection win when cards are clicked faster than a build", async () => {
    mocks.engine.holdReady();
    selectPlain("Class", "(gc) => gc");
    const stale = previewSelectedObject();

    // Second card clicked while the first build is still parked on whenReady().
    selectPlain("RelationClass", "(gc) => gc");
    const fresh = previewSelectedObject();

    mocks.engine.release();
    await Promise.all([stale, fresh]);

    // The superseded build must not draw at all: both write the one shared globalObject,
    // so whichever finishes last owns the canvas — and that need not be the last click.
    expect(mocks.instanceCreationHandler.createClassInstance).not.toHaveBeenCalled();
    expect(mocks.instanceCreationHandler.createRelationclassInstance).toHaveBeenCalledTimes(1);
    expect(mocks.graphicContext.drawVizRep_rel).toHaveBeenCalledTimes(1);
  });

  it("keeps serving later selections after a build fails", async () => {
    mocks.graphicContext.drawVizRep.mockRejectedValueOnce(new Error("webgl blew up"));
    selectPlain("Class", "(gc) => gc");
    await expect(previewSelectedObject()).rejects.toThrow("webgl blew up");

    selectPlain("Class", "(gc) => gc");
    await previewSelectedObject();

    expect(mocks.graphicContext.drawVizRep).toHaveBeenCalledTimes(2);
  });
});

describe("clearPreview", () => {
  it("rebuilds an empty mock scene", async () => {
    await clearPreview();

    expect(mocks.graphicContext.resetInstance).toHaveBeenCalled();
    expect(mocks.globalObject.tabContext).toEqual([]);
    expect(mocks.graphicContext.runVizRepFunction).not.toHaveBeenCalled();
    expect(mocks.globalObject.render).toBe(true);
  });

  it("is a no-op before the engine has mounted", async () => {
    mocks.globalObject.sceneTypes = [];

    await clearPreview();

    expect(mocks.graphicContext.resetInstance).not.toHaveBeenCalled();
  });
});
