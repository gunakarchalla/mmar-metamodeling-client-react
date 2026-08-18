/**
 * The 3D engine's composition root, and the facade the React canvas drives it
 * through.
 *
 * Each engine module exports a single instance of itself, created as a side
 * effect of being imported. This file imports them in dependency order — the
 * global state first, then the leaf helpers, then the handlers, then the
 * initiator — so those instances are constructed in an order that never asks for
 * one that does not exist yet. Every engine module must be reached through this
 * file for that to hold; importing one directly can reintroduce the circular
 * imports the ordering exists to avoid.
 *
 * `mount(container)` / `unmount(token)` are the whole public surface: the canvas
 * component hands in the element to render into and gets back a token
 * identifying its mount.
 */
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";
import { globalObject } from "@/engine/global-definition";
import { rayHelper } from "@/engine/ray-helper";
import { mouseObject } from "@/engine/mouse-object";
import { resize } from "@/engine/resize";
import { animator } from "@/engine/animator";
import { arInitiator } from "@/engine/ar-initiator";
import { graphicContext } from "@/engine/graphic-context";
// State holders the interaction handlers read and write.
import { globalSelectedObject } from "@/engine/global-selected-object";
import { globalClassObject } from "@/engine/global-class-object";
import { globalRelationclassObject } from "@/engine/global-relationclass-object";
import { globalStateObject } from "@/engine/global-state-object";
import { interactionHandler } from "@/engine/interaction-handler";
import { instanceCreationHandler } from "@/engine/instance-creation-handler";
import { transformControlsEvents } from "@/engine/transform-control-events";
import { lineUpdateService } from "@/engine/line-update-service";
// Subscribes to the event bus in its constructor, so importing it here is what
// registers the VizRep-update listeners.
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

// Building the cameras, scene, controls and mock objects is expensive, and must
// happen exactly once for the life of the page.
//
// A boolean set *after* the await would not achieve that: two mounts racing the
// same in-flight init would both see `false` and both run it. Here that is the
// normal case rather than an edge case — the canvas mounts and unmounts on every
// object, type and tab switch, and React's strict mode double-invokes the effect
// in development. A second init would push another mock scene type, add another
// mouse pointer to the scene, build a second set of orbit controls over the same
// canvas and register another resize listener, none of them removable.
//
// Memoizing the init *promise* is what makes concurrent mounts await one init.
let initPromise: Promise<void> | null = null;
let initialized = false;

// Resolves once that one-time init has completed — once the mock scene type, the
// scene and the cameras exist and the render loop is running.
//
// Code outside the canvas component holds no mount token and cannot await the
// mount, but must not touch engine state before init either: the preview
// pipeline needs the mock scene type that init creates. The selection-to-preview
// trigger fires from a parent effect and React runs child effects first, so the
// canvas has always *started* mounting by then — but starting is not being
// ready, and this promise is that difference.
//
// It never rejects. A failed init leaves it pending until a later mount succeeds,
// so awaiters stay parked while the canvas is dead — which is right, since there
// is nothing to draw into.
let signalReady: () => void;
const readyPromise = new Promise<void>((resolve) => {
  signalReady = resolve;
});

// Every mount takes the next token and becomes the engine's owner. An attach or
// an unmount whose token is no longer current has been superseded and must leave
// the renderer alone.
//
// This is what makes the interleaving of an async mount and a synchronous unmount
// safe. Strict mode's mount → unmount → mount reuses the *same* container
// element, so ownership cannot be decided by comparing elements; and since the
// unmount is deferred until the in-flight mount settles, a stale cleanup would
// otherwise detach the canvas the newer mount just attached.
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
        // Enable WebXR and wire the session callbacks. Harmless where XR is
        // unavailable — the AR button then just reports that it is unsupported.
        arInitiator.enableXR();
        initialized = true;
        signalReady();
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

    // Init picks the 3D camera unconditionally but honours the 2D/3D flag when
    // building the orbit controls, so a toggle that lands while init is still in
    // flight leaves 2D controls driving the 3D camera. Re-applying the flag makes
    // the two agree on every mount, and is a no-op when they already do.
    engine.setThreeDimensional(globalObject.threeDimensional);

    // Init has already appended the canvas to the container; for every later
    // mount this is the re-attach. Both paths converge here, so there is exactly
    // one place that starts the render loop.
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
   * Swaps the active camera and orbit controls the same way init does, then
   * flags a redraw. Cameras and controls only exist once the engine has been
   * mounted, so before that this just records the flag for the next init to
   * honour.
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
   * A button that starts and ends an immersive AR session for this renderer.
   *
   * It feature-detects `immersive-ar` itself, rendering an inert "AR NOT
   * SUPPORTED" label where the browser has none, so callers need no check of
   * their own. Hand tracking is requested optionally, for the pinch-to-grab
   * hands the engine sets up when a session starts.
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

    // Safe even if init never ran (a rejected mount, or an unmount racing a failed
    // init): the renderer exists from module load, but with no loop started and
    // nothing appended, both calls below are no-ops.
    globalObject.renderer.setAnimationLoop(null);
    const dom = globalObject.renderer.domElement;
    if (dom.parentElement) {
      dom.parentElement.removeChild(dom);
    }
  },

  /**
   * Await the one-time init. Resolves immediately once it has completed, and
   * stays pending until some canvas has mounted successfully. Await this before
   * reading or writing engine state from anywhere that did not itself mount.
   */
  whenReady(): Promise<void> {
    return readyPromise;
  },

  /** Has the one-time init completed? Exposed for tests. */
  get isInitialized(): boolean {
    return initialized;
  },
};
