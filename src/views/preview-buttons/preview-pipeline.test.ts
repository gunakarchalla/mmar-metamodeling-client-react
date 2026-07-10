// Preview edge cases (P5.2): geometry is live-committed on every keystroke (D2), so a
// half-typed snippet is the *normal* state of the buffer. `parseObj`/`parseMetaFunction`
// evaluate that snippet with `new Function(...)` and throw on anything unparsable.
//
// Two properties are pinned here:
//   1. an empty or invalid snippet logs an error and returns — it never throws;
//   2. it returns *before* the engine reset, so the canvas keeps the last good preview
//      instead of being wiped by a stray character.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Class } from "@gds";

const mocks = vi.hoisted(() => ({
  selected: null as unknown,
  logger: { log: vi.fn() },
  graphicContext: {
    resetInstance: vi.fn(() => Promise.resolve()),
    runVizRepFunction: vi.fn(() => Promise.resolve()),
    drawVizRep: vi.fn(() => Promise.resolve({})),
    drawVizRep_rel: vi.fn(() => Promise.resolve({})),
  },
  metaUtility: { parseMetaFunction: vi.fn((s: string) => Promise.resolve(s)) },
}));

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
  globalObject: {
    sceneTypes: [{ uuid: "mock-scene-type" }],
    tabContext: [],
    scene: { add: vi.fn(), getObjectByProperty: vi.fn() },
    sceneTree: null,
    current_class_instance: null,
    current_port_instance: null,
    mockClassInstance: {},
    selectedTab: 0,
    render: false,
  },
  graphicContext: mocks.graphicContext,
  sceneInitiator: { sceneInit: vi.fn(() => Promise.resolve()) },
  instanceCreationHandler: {
    create_UUID: vi.fn(() => "generated-uuid"),
    createClassInstance: vi.fn(() => Promise.resolve({ uuid: "ci" })),
    createRelationclassInstance: vi.fn(() => Promise.resolve({ uuid: "ri" })),
    createPortInstance: vi.fn(() => Promise.resolve({ uuid: "pi" })),
    addPointToClassInstance: vi.fn(),
    addLinePoint: vi.fn(),
    addLastLinePoint: vi.fn(),
  },
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
      getClasses: () => [],
      getRelationClasses: () => [],
      getPorts: () => [],
    }),
  },
}));

import { runPreview } from "./preview-pipeline";

/** gds types `geometry` as Function though it holds a string at runtime (plan §4.4). */
function classWithGeometry(geometry: string): Class {
  const cls = new Class("class-uuid", "Demo", false, false);
  cls.geometry = geometry as unknown as typeof cls.geometry;
  return cls;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.selected = null;
});

describe("runPreview — geometry guards", () => {
  it("logs and returns when nothing is selected", async () => {
    await expect(runPreview()).resolves.toBeUndefined();
    expect(mocks.logger.log).toHaveBeenCalledWith("No object selected to preview", "error");
  });

  it("logs and returns on empty geometry without resetting the engine", async () => {
    mocks.selected = classWithGeometry("   ");

    await expect(runPreview()).resolves.toBeUndefined();

    expect(mocks.logger.log).toHaveBeenCalledWith("Cannot preview: geometry is empty", "error");
    expect(mocks.graphicContext.resetInstance).not.toHaveBeenCalled();
  });

  it("logs and returns on syntactically invalid geometry — never throws", async () => {
    mocks.selected = classWithGeometry("function ( { this is not js");

    await expect(runPreview()).resolves.toBeUndefined();

    expect(mocks.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("Cannot preview: geometry is not valid JavaScript"),
      "error",
    );
  });

  it("keeps the last good preview: an invalid snippet resets nothing", async () => {
    // The regression: parsing used to happen *after* resetInstance()/tabContext = [],
    // so one bad character both threw and cleared the canvas.
    mocks.selected = classWithGeometry("}}} nope");

    await runPreview();

    expect(mocks.graphicContext.resetInstance).not.toHaveBeenCalled();
    expect(mocks.graphicContext.runVizRepFunction).not.toHaveBeenCalled();
  });

  it("propagates a parseMetaFunction failure as a log, not a throw", async () => {
    mocks.selected = classWithGeometry("() => {}");
    mocks.metaUtility.parseMetaFunction.mockRejectedValueOnce(new Error("bad meta fn"));

    await expect(runPreview()).resolves.toBeUndefined();

    expect(mocks.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("bad meta fn"),
      "error",
    );
    expect(mocks.graphicContext.resetInstance).not.toHaveBeenCalled();
  });

  it("compiles valid geometry and proceeds to build the preview", async () => {
    mocks.selected = classWithGeometry("(gc) => gc");

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
