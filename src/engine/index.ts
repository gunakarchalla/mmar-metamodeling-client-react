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
// run exactly ONCE for the lifetime of the singleton engine. React StrictMode
// double-invokes effects in dev (mount -> unmount -> mount); guarding with this
// flag keeps the second mount a cheap re-attach instead of a duplicate init.
let initialized = false;

export const engine = {
  /**
   * Boot (or re-attach) the engine into `container`. Idempotent: the heavy
   * `initiator.init()` + `initEventListeners()` run only on the first mount;
   * subsequent mounts (e.g. after a StrictMode unmount) re-attach the existing
   * canvas and restart the render loop.
   */
  async mount(container: HTMLElement): Promise<void> {
    globalObject.elementContainer = container;

    if (!initialized) {
      await initiator.init();
      await initiator.initEventListeners();
      // Phase 11: turn on WebXR + wire session start/end. Harmless on devices
      // without XR (the ARButton just reports "AR NOT SUPPORTED").
      arInitiator.enableXR();
      initialized = true;
    } else {
      if (globalObject.renderer.domElement.parentElement !== container) {
        container.appendChild(globalObject.renderer.domElement);
      }
      globalObject.renderer.setSize(container.clientWidth, container.clientHeight, true);
      globalObject.renderer.setAnimationLoop(arInitiator.render.bind(arInitiator));
      globalObject.render = true;
    }
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
   * cameras / controls are preserved so a later `mount()` is a cheap re-attach.
   */
  unmount(): void {
    globalObject.renderer.setAnimationLoop(null);
    const dom = globalObject.renderer.domElement;
    if (dom.parentElement) {
      dom.parentElement.removeChild(dom);
    }
  },
};
