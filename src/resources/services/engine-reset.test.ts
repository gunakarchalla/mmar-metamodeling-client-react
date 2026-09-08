// engine-reset: the engine half of the sign-out teardown.
//
// The engine's singletons live as long as the PAGE — `engine.unmount()` only
// stops the render loop and detaches the canvas, preserving the renderer, the
// scene and everything drawn into it — so without this the next user's first
// preview would open over the previous user's meshes, and `globalObject`'s file
// cache would keep serving files fetched with the departing user's token.
//
// The two properties worth pinning are opposites, and both are easy to get
// wrong: what a *drawn preview* left behind must go, and the scaffolding
// `initiator.init()` built once must NOT — `init` is memoised and never runs
// again, so clearing the mock scene type would break the preview permanently.
//
// The engine leaves are mocked so `three` never loads: importing it for real
// constructs a WebGLRenderer at module scope, which has no context under node.
import { describe, it, expect, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  globalObject: {
    selectedTab: 0,
    tabContext: [] as unknown[],
    dragObjects: [] as unknown[],
    updateLinesArray: [] as unknown[],
    buttonObjects: [] as unknown[],
    attribute_instances: [] as unknown[],
    role_instances: [] as unknown[],
    objectScaled: false,
    current_class_instance: undefined as unknown,
    current_port_instance: undefined as unknown,
    current_meta_port: undefined as unknown,
    sceneTree: [] as unknown[],
    // Scaffolding: built once by `initiator.init()` and never rebuilt.
    sceneTypes: [] as unknown[],
    mockClass: { uuid: "mock-class" } as unknown,
    localFiles: new Map<string, string>(),
    readyForVizRepUpdate: true,
    threeDimensional: true,
    transformControls: { detach: vi.fn() },
  },
  globalSelectedObject: { removeObject: vi.fn() },
  globalStateObject: { activeStateLine: undefined as unknown },
  graphicContext: { resetInstance: vi.fn<() => Promise<void>>(() => Promise.resolve()) },
  sceneInitiator: { sceneInit: vi.fn<() => Promise<void>>(() => Promise.resolve()) },
}));

vi.mock("@/engine/global-definition", () => ({ globalObject: mocks.globalObject }));
vi.mock("@/engine/global-selected-object", () => ({
  globalSelectedObject: mocks.globalSelectedObject,
}));
vi.mock("@/engine/global-state-object", () => ({ globalStateObject: mocks.globalStateObject }));
vi.mock("@/engine/graphic-context", () => ({ graphicContext: mocks.graphicContext }));
vi.mock("@/engine/scene-initiator", () => ({ sceneInitiator: mocks.sceneInitiator }));

import { resetEngineState } from "./engine-reset";
import { eventBus } from "./event-bus";

/** Put the engine in the state "user A previewed a class with a relation on it". */
function seedPreview() {
  const g = mocks.globalObject;
  g.tabContext = [{ sceneInstance: { uuid: "si-1" }, contextDragObjects: [{}, {}] }];
  g.selectedTab = 3;
  g.dragObjects = [{}, {}];
  g.updateLinesArray = [{}];
  g.buttonObjects = [{}];
  g.attribute_instances = [{}];
  g.role_instances = [{}];
  g.objectScaled = true;
  g.current_class_instance = { uuid: "ci-1" };
  g.current_port_instance = { uuid: "pi-1" };
  g.current_meta_port = { uuid: "mp-1" };
  g.sceneTree = [{ uuid: "st-1", children: [{ uuid: "si-1" }] }];
  g.sceneTypes = [{ uuid: "mock-scene-type", name: "MockSceneType" }];
  g.localFiles.set("file-1", "data:model/gltf+json,…");
  g.readyForVizRepUpdate = false;
  g.threeDimensional = false;
  mocks.globalStateObject.activeStateLine = { uuid: "line-1" };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.globalObject.transformControls = { detach: vi.fn() };
  mocks.globalObject.localFiles.clear();
  seedPreview();
});

describe("resetEngineState", () => {
  it("detaches the transform gizmo and drops the engine's selection", async () => {
    const { transformControls } = mocks.globalObject;

    await resetEngineState();

    expect(transformControls.detach).toHaveBeenCalled();
    expect(mocks.globalSelectedObject.removeObject).toHaveBeenCalled();
  });

  it("clears everything a drawn preview left behind", async () => {
    await resetEngineState();

    const g = mocks.globalObject;
    expect(g.tabContext).toEqual([]);
    expect(g.selectedTab).toBe(0);
    // The pick list is what made the previous user's meshes draggable.
    expect(g.dragObjects).toEqual([]);
    expect(g.updateLinesArray).toEqual([]);
    expect(g.buttonObjects).toEqual([]);
    expect(g.attribute_instances).toEqual([]);
    expect(g.role_instances).toEqual([]);
    expect(g.objectScaled).toBe(false);
    expect(g.current_class_instance).toBeUndefined();
    expect(g.current_port_instance).toBeUndefined();
    expect(g.current_meta_port).toBeUndefined();
    expect(g.sceneTree).toEqual([]);
    expect(mocks.globalStateObject.activeStateLine).toBeUndefined();
    expect(mocks.graphicContext.resetInstance).toHaveBeenCalled();
  });

  it("rebuilds the scene through sceneInit rather than replacing it wholesale", async () => {
    // A bare `new THREE.Scene()` would drop the transform controls, the lights,
    // the grid, the 3D mouse pointer and the intersection plane the raycasters
    // need — none of which anything rebuilds, since init runs once per page.
    await resetEngineState();

    expect(mocks.sceneInitiator.sceneInit).toHaveBeenCalledTimes(1);
    // And only once the drawn-object registries are gone.
    expect(mocks.graphicContext.resetInstance.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.sceneInitiator.sceneInit.mock.invocationCallOrder[0],
    );
  });

  it("keeps the scaffolding init built once for the life of the page", async () => {
    await resetEngineState();

    // `runPreview` bails out with "Engine not ready for preview" the moment this
    // is empty, and `init` is memoised — it would never be refilled.
    expect(mocks.globalObject.sceneTypes).toHaveLength(1);
    expect(mocks.globalObject.mockClass).toBeTruthy();
  });

  it("drops files fetched with the departing user's token", async () => {
    await resetEngineState();

    expect(mocks.globalObject.localFiles.size).toBe(0);
  });

  it("releases the live-preview lock and returns to the 3D default", async () => {
    // Held across a sign-out, `expression-utility` would wait on it in a loop.
    await resetEngineState();

    expect(mocks.globalObject.readyForVizRepUpdate).toBe(true);
    expect(mocks.globalObject.threeDimensional).toBe(true);
  });

  it("is idempotent on an engine that has drawn nothing", async () => {
    await resetEngineState();
    await expect(resetEngineState()).resolves.toBeUndefined();
    expect(mocks.globalObject.tabContext).toEqual([]);
  });
});

describe("the login channel", () => {
  it("runs the teardown on sign-out", async () => {
    eventBus.publish("login", false);
    // The listener is synchronous and kicks off the async teardown; let it settle.
    await vi.waitFor(() => expect(mocks.sceneInitiator.sceneInit).toHaveBeenCalled());

    expect(mocks.globalObject.tabContext).toEqual([]);
    expect(mocks.globalObject.localFiles.size).toBe(0);
  });

  it("leaves the engine alone on sign-in, which happens after the teardown", async () => {
    eventBus.publish("login", true);
    await Promise.resolve();

    expect(mocks.graphicContext.resetInstance).not.toHaveBeenCalled();
    expect(mocks.globalObject.tabContext).toHaveLength(1);
  });
});
