// @vitest-environment jsdom
//
// Lifecycle contract for the `engine` mount facade (P5).
//
// In vizrep the canvas lived for the whole page life, so mount/unmount ran once.
// Embedded in the metamodeling client's General tab it mounts and unmounts on every
// object / type / tab switch, and StrictMode double-invokes the effect in dev. These
// tests pin the three properties that makes survivable:
//   1. the heavy initiator.init() runs at most once, even for mounts that race it;
//   2. the singleton renderer is re-attached, never recreated (no WebGL context leak);
//   3. a cleanup that lands after a newer mount cannot detach the newer canvas.
//
// The engine's 19 sibling modules are mocked so `three` never loads: importing it for
// real constructs a WebGLRenderer at module scope, which has no context under jsdom.
import { describe, it, expect, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  initiator: {
    init: vi.fn<() => Promise<void>>(() => Promise.resolve()),
    initEventListeners: vi.fn<() => Promise<void>>(() => Promise.resolve()),
  },
  arInitiator: { enableXR: vi.fn(), render: vi.fn() },
  globalObject: {
    elementContainer: null as HTMLElement | null,
    render: false,
    renderer: null as unknown as {
      domElement: HTMLCanvasElement;
      setSize: ReturnType<typeof vi.fn>;
      setAnimationLoop: ReturnType<typeof vi.fn>;
    },
  },
}));

vi.mock("three/examples/jsm/webxr/ARButton.js", () => ({ ARButton: { createButton: vi.fn() } }));
vi.mock("@/engine/global-definition", () => ({ globalObject: mocks.globalObject }));
vi.mock("@/engine/initiator", () => ({ initiator: mocks.initiator }));
vi.mock("@/engine/ar-initiator", () => ({ arInitiator: mocks.arInitiator }));
vi.mock("@/engine/ray-helper", () => ({ rayHelper: {} }));
vi.mock("@/engine/mouse-object", () => ({ mouseObject: {} }));
vi.mock("@/engine/resize", () => ({ resize: { resize: vi.fn() } }));
vi.mock("@/engine/animator", () => ({ animator: {} }));
vi.mock("@/engine/graphic-context", () => ({ graphicContext: {} }));
vi.mock("@/engine/global-selected-object", () => ({ globalSelectedObject: {} }));
vi.mock("@/engine/global-class-object", () => ({ globalClassObject: {} }));
vi.mock("@/engine/global-relationclass-object", () => ({ globalRelationclassObject: {} }));
vi.mock("@/engine/global-state-object", () => ({ globalStateObject: {} }));
vi.mock("@/engine/interaction-handler", () => ({ interactionHandler: {} }));
vi.mock("@/engine/instance-creation-handler", () => ({ instanceCreationHandler: {} }));
vi.mock("@/engine/transform-control-events", () => ({ transformControlsEvents: {} }));
vi.mock("@/engine/line-update-service", () => ({ lineUpdateService: {} }));
vi.mock("@/engine/vizrep-update-checker", () => ({ vizrepUpdateChecker: {} }));
vi.mock("@/engine/scene-initiator", () => ({ sceneInitiator: {} }));

type Engine = typeof import("@/engine").engine;

/** Fresh module state per test — `initPromise` / `mountToken` are module-scoped. */
async function loadEngine(): Promise<Engine> {
  vi.resetModules();
  return (await import("@/engine")).engine;
}

function makeContainer(): HTMLElement {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return el;
}

/** A promise plus its resolvers, to hold `init()` open and drive the race by hand. */
function deferred<T = void>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";

  mocks.initiator.init.mockImplementation(() => Promise.resolve());
  mocks.initiator.initEventListeners.mockImplementation(() => Promise.resolve());
  mocks.globalObject.elementContainer = null;
  mocks.globalObject.render = false;
  mocks.globalObject.renderer = {
    domElement: document.createElement("canvas"),
    setSize: vi.fn(),
    setAnimationLoop: vi.fn(),
  };
});

describe("engine.mount — one-time init", () => {
  it("runs the heavy init exactly once for two mounts racing the same in-flight init", async () => {
    // The regression this guards: with `initialized` set *after* `await init()`,
    // both mounts observe `false` and both run the heavy branch — pushing a second
    // MockSceneType, a second mousePointer3d and a second pair of OrbitControls.
    const gate = deferred();
    mocks.initiator.init.mockImplementation(() => gate.promise);

    const engine = await loadEngine();
    const first = engine.mount(makeContainer());
    const second = engine.mount(makeContainer());

    gate.resolve();
    await Promise.all([first, second]);

    expect(mocks.initiator.init).toHaveBeenCalledTimes(1);
    expect(mocks.initiator.initEventListeners).toHaveBeenCalledTimes(1);
  });

  it("does not re-initialise on a later remount, and re-attaches the same canvas", async () => {
    const engine = await loadEngine();
    const canvas = mocks.globalObject.renderer.domElement;

    const elA = makeContainer();
    const tokenA = await engine.mount(elA);
    expect(canvas.parentElement).toBe(elA);

    engine.unmount(tokenA);
    expect(canvas.parentElement).toBeNull();

    const elB = makeContainer();
    await engine.mount(elB);

    // Re-attached, not recreated: same canvas node, init never ran twice.
    expect(mocks.initiator.init).toHaveBeenCalledTimes(1);
    expect(mocks.globalObject.renderer.domElement).toBe(canvas);
    expect(canvas.parentElement).toBe(elB);
  });

  it("restarts the render loop on every mount and reports initialisation", async () => {
    const engine = await loadEngine();
    const el = makeContainer();

    expect(engine.isInitialized).toBe(false);
    await engine.mount(el);

    expect(engine.isInitialized).toBe(true);
    expect(mocks.globalObject.render).toBe(true);
    expect(mocks.globalObject.renderer.setAnimationLoop).toHaveBeenLastCalledWith(expect.any(Function));
    expect(mocks.globalObject.renderer.setSize).toHaveBeenCalled();
  });

  it("lets a later mount retry after a failed init", async () => {
    mocks.initiator.init.mockImplementationOnce(() => Promise.reject(new Error("no webgl")));

    const engine = await loadEngine();
    await expect(engine.mount(makeContainer())).rejects.toThrow("no webgl");

    // The memoized promise must be cleared, or the engine stays wedged forever.
    await expect(engine.mount(makeContainer())).resolves.toEqual(expect.any(Number));
    expect(mocks.initiator.init).toHaveBeenCalledTimes(2);
  });
});

describe("engine.unmount — token ownership", () => {
  it("stops the render loop and detaches when the token is current", async () => {
    const engine = await loadEngine();
    const el = makeContainer();
    const token = await engine.mount(el);

    engine.unmount(token);

    expect(mocks.globalObject.renderer.setAnimationLoop).toHaveBeenLastCalledWith(null);
    expect(mocks.globalObject.renderer.domElement.parentElement).toBeNull();
  });

  it("ignores a stale token so a superseded cleanup cannot detach a newer canvas", async () => {
    const engine = await loadEngine();
    const staleToken = await engine.mount(makeContainer());
    const elNew = makeContainer();
    await engine.mount(elNew);

    engine.unmount(staleToken);

    expect(mocks.globalObject.renderer.domElement.parentElement).toBe(elNew);
  });

  it("detaches unconditionally when called with no token", async () => {
    const engine = await loadEngine();
    await engine.mount(makeContainer());

    engine.unmount();

    expect(mocks.globalObject.renderer.domElement.parentElement).toBeNull();
  });
});

describe("engine — StrictMode double-mount", () => {
  it("leaves the canvas attached and the loop running after mount -> deferred unmount -> mount", async () => {
    // React StrictMode reuses the *same* container element, so ownership cannot be
    // decided by comparing containers — hence the token. ThreeCanvas defers its
    // unmount behind the in-flight mount, so the stale cleanup lands *after* the
    // second mount has already attached.
    const gate = deferred();
    mocks.initiator.init.mockImplementation(() => gate.promise);

    const engine = await loadEngine();
    const el = makeContainer();

    const firstMount = engine.mount(el); // effect #1
    const secondMount = engine.mount(el); // effect #2 (same element)

    gate.resolve();
    const staleToken = await firstMount;
    await secondMount;

    // Cleanup #1 finally runs, carrying the now-stale token.
    engine.unmount(staleToken);

    expect(mocks.initiator.init).toHaveBeenCalledTimes(1);
    expect(mocks.globalObject.renderer.domElement.parentElement).toBe(el);
    expect(mocks.globalObject.renderer.setAnimationLoop).not.toHaveBeenLastCalledWith(null);
  });
});
