/**
 * engine/index.ts — COMPOSITION ROOT + mount facade.
 *
 * Each engine module already exports its own module singleton (the P2/P3 pattern
 * that replaced Aurelia `@singleton()` DI). This file imports them in dependency
 * order — global-definition first, then the leaf helpers (ray-helper, mouse-object,
 * resize, animator), then the handlers, then the initiator — so the import side
 * effects (the `new ClassName()` at the bottom of each file) run in a deterministic
 * order. P3 has no circular engine deps yet; P4/P5 add graphic-context + the
 * dynamics handlers, which must keep being wired through this file in order to
 * avoid the circular-import crashes noted in plan §3.
 *
 * The `engine` facade exposes `mount(container)` / `unmount()` for the React
 * `ThreeCanvas` (P8): it replaces the old `my-app.attached()` flow
 * (`initiator.init()` + `initiator.initEventListeners()`) and the old
 * `#container` DOM-polling — the container element is passed in directly.
 */
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";
import { globalObject } from "@/engine/global-definition";
import { rayHelper } from "@/engine/ray-helper";
import { mouseObject } from "@/engine/mouse-object";
import { resize } from "@/engine/resize";
import { animator } from "@/engine/animator";
import { arInitiator } from "@/engine/ar-initiator";
import { graphicContext } from "@/engine/graphic-context";
// global-* state holders the dynamics handlers depend on (P5).
import { globalSelectedObject } from "@/engine/global-selected-object";
import { globalClassObject } from "@/engine/global-class-object";
import { globalRelationclassObject } from "@/engine/global-relationclass-object";
import { globalStateObject } from "@/engine/global-state-object";
import { interactionHandler } from "@/engine/interaction-handler";
import { instanceCreationHandler } from "@/engine/instance-creation-handler";
import { transformControlsEvents } from "@/engine/transform-control-events";
import { lineUpdateService } from "@/engine/line-update-service";
// vizrep-update-checker subscribes to the bus in its constructor — importing it
// here registers the checkForVizRepUpdate* listeners when the engine module loads.
import { vizrepUpdateChecker } from "@/engine/vizrep-update-checker";
import { sceneInitiator } from "@/engine/scene-initiator";
import { initiator } from "@/engine/initiator";

export {
  globalObject,
  rayHelper,
  mouseObject,
  resize,
  animator,
  arInitiator,
  graphicContext,
  globalSelectedObject,
  globalClassObject,
  globalRelationclassObject,
  globalStateObject,
  interactionHandler,
  instanceCreationHandler,
  transformControlsEvents,
  lineUpdateService,
  vizrepUpdateChecker,
  sceneInitiator,
  initiator,
};

// init() is expensive (builds cameras / scene / controls / mock objects) and must
// run exactly ONCE for the lifetime of the singleton engine.
//
// A plain `let initialized = false` set *after* `await initiator.init()` does not
// hold: two mounts that race the same in-flight init both observe `false` and both
// run the heavy branch. In the metamodeling client that is the normal case, not an
// edge case — ThreeCanvas mounts/unmounts on every object/type/tab switch (plan
// §4.5), and StrictMode double-invokes the effect in dev. A duplicate init pushes a
// second MockSceneType, adds a second mousePointer3d to the scene, builds a second
// pair of OrbitControls over the same canvas, and re-registers the window resize
// listener — all unremovable.
//
// So we memoize the init *promise* (not a boolean). Concurrent mounts await the
// same init; only the first creates it.
let initPromise: Promise<void> | null = null;
let initialized = false;

// Monotonic mount token. Every mount() takes the next token and becomes the engine's
// owner. An attach or an unmount whose token is no longer current has been superseded
// by a newer mount and must not touch the renderer.
//
// This is what makes the async mount/sync unmount interleaving safe. StrictMode's
// mount -> unmount -> mount reuses the *same* container element, so ownership cannot
// be decided by comparing elements; and because unmount is deferred until the
// in-flight mount settles (see ThreeCanvas), a stale cleanup would otherwise detach
// the canvas that the *newer* mount just attached.
let mountToken = 0;

export const engine = {
  /**
   * Boot (or re-attach) the engine into `container`, and return the mount token
   * identifying this mount. Pass that token to `unmount(token)` so a superseded
   * cleanup becomes a no-op.
   *
   * Idempotent and concurrency-safe: the heavy `initiator.init()` +
   * `initEventListeners()` run at most once per page life; every mount (including
   * the first) then ensures the singleton canvas is attached to `container` with a
   * running render loop. The renderer is never recreated — only re-attached.
   */
  async mount(container: HTMLElement): Promise<number> {
    const token = ++mountToken;
    globalObject.elementContainer = container;

    if (!initPromise) {
      initPromise = (async () => {
        await initiator.init();
        await initiator.initEventListeners();
        // Phase 11: turn on WebXR + wire session start/end. Harmless on devices
        // without XR (the ARButton just reports "AR NOT SUPPORTED").
        arInitiator.enableXR();
        initialized = true;
      })().catch((err: unknown) => {
        // Let a later mount retry a failed init rather than wedging the engine.
        initPromise = null;
        throw err;
      });
    }
    await initPromise;

    // Superseded while init was in flight: the newer mount owns the renderer and
    // will attach it to its own container. Attaching here would steal the canvas.
    if (token !== mountToken) return token;

    // initCamera() unconditionally selects the 3D camera while initOrbitControls()
    // honours globalObject.threeDimensional, so a toggle landing before init()
    // settles leaves 2D controls driving the 3D camera. Re-applying the flag makes
    // camera and controls agree on every mount; it is a no-op when they already do.
    engine.setThreeDimensional(globalObject.threeDimensional);

    // init() already appended the canvas into `elementContainer`; for every later
    // mount this is the re-attach. Both paths converge here so there is exactly one
    // place that starts the render loop.
    const dom = globalObject.renderer.domElement;
    if (dom.parentElement !== container) {
      container.appendChild(dom);
    }
    globalObject.renderer.setSize(container.clientWidth, container.clientHeight, true);
    globalObject.renderer.setAnimationLoop(arInitiator.render.bind(arInitiator));
    globalObject.render = true;

    return token;
  },

  /**
   * Switch the live preview between 2D (orthographic) and 3D (perspective).
   *
   * The old client only ever set `threeDimensional` once, at init
   * (`initiator.initOrbitControls` picks the matching camera/controls). Here the
   * toolbar exposes a runtime toggle, so this swaps the active camera + orbit
   * controls the same way init does and flags a re-render. Cameras/controls only
   * exist after `mount()`/`init()`, so before that we just record the flag and the
   * next `init()` honours it.
   */
  setThreeDimensional(is3d: boolean): void {
    globalObject.threeDimensional = is3d;
    if (!initialized) return;

    if (is3d) {
      globalObject.normalCamera = globalObject.normalCamera3d;
      globalObject.orbitControls = globalObject.orbitControls3d;
    } else {
      globalObject.normalCamera = globalObject.normalCamera2d;
      globalObject.orbitControls = globalObject.orbitControls2d;
    }
    globalObject.camera = globalObject.normalCamera;
    globalObject.render = true;
  },

  /**
   * Phase 11: create three's ARButton bound to our renderer. It feature-detects
   * `immersive-ar` and starts/ends the XR session on click (which fires the
   * sessionstart/sessionend listeners registered by `arInitiator.enableXR()`);
   * on unsupported browsers it renders an inert "AR NOT SUPPORTED" label, so the
   * non-AR path is unaffected. `hand-tracking` is requested optionally for the
   * pinch-to-grab hands in `arInitiator.initHands()`.
   */
  createARButton(): HTMLElement {
    arInitiator.enableXR();
    return ARButton.createButton(globalObject.renderer, {
      optionalFeatures: ["hand-tracking"],
    });
  },

  /**
   * Stop the render loop and detach the canvas from the DOM. The singleton scene /
   * cameras / controls / renderer are preserved so a later `mount()` is a cheap
   * re-attach — never a recreate (a recreated WebGLRenderer would leak its context;
   * browsers cap live contexts at ~16 and start dropping the oldest).
   *
   * Pass the token returned by the matching `mount()`. If a newer mount has since
   * taken ownership this call is a no-op, which is what makes a cleanup that was
   * deferred behind an in-flight mount safe. Calling with no token forces the
   * detach unconditionally.
   */
  unmount(token?: number): void {
    if (token !== undefined && token !== mountToken) return;

    // Nothing to detach if init never ran (mount rejected, or unmount raced an init
    // that failed) — the renderer exists from module load, but the loop was never
    // started and the canvas was never appended.
    globalObject.renderer.setAnimationLoop(null);
    const dom = globalObject.renderer.domElement;
    if (dom.parentElement) {
      dom.parentElement.removeChild(dom);
    }
  },

  /** Test seam: has the heavy one-time init completed? */
  get isInitialized(): boolean {
    return initialized;
  },
};
