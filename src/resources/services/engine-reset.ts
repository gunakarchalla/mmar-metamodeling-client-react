import { globalObject } from "@/engine/global-definition";
import { globalSelectedObject } from "@/engine/global-selected-object";
import { globalStateObject } from "@/engine/global-state-object";
import { graphicContext } from "@/engine/graphic-context";
import { sceneInitiator } from "@/engine/scene-initiator";
import { eventBus } from "./event-bus";

/**
 * The engine half of the sign-out teardown; `session-reset` alongside it is the
 * store half, and both hang off the same `login: false` publish.
 *
 * It sits here rather than in `src/engine/` for the same reason the other
 * engine-facing services do — and because `src/engine/` (bar its `index.ts`) is
 * kept byte-identical with `mmar-vizrep-client-react`, which has no sessions to
 * tear down. `engine/index.ts` side-effect-imports it, so it is armed exactly
 * when the engine loads.
 *
 * They are separate modules because this one may legitimately never load. The
 * engine sits behind the lazily-imported VizRep editor chunk and builds a
 * `WebGLRenderer` at module scope, so reaching it from the store half — which
 * `main.tsx` imports — would cost every visitor a three.js download and a WebGL
 * context on the sign-in screen. A session that never opened the VizRep editor
 * also leaves nothing here to reset, so "armed only once the engine has loaded"
 * is the right behaviour rather than a compromise.
 *
 * WHAT SURVIVES, deliberately: everything `initiator.init()` builds once for the
 * life of the page — the renderer, the cameras, the orbit controls, the
 * intersection plane and 3D mouse pointer, and the mock scene type / class /
 * class instance the preview draws into. `init()` is memoised and never runs a
 * second time, so clearing that scaffolding would break the preview
 * permanently: `runPreview` bails out with "Engine not ready for preview" as
 * soon as `globalObject.sceneTypes` is empty. Only what a *drawn* preview put
 * there is torn down here, and the next preview rebuilds all of that anyway.
 *
 * Engine state this client never writes is left alone rather than reset — the
 * `globalObject` fields carried over from the vizrep engine this was ported from
 * (`accessToken`, `classes`, `relationClasses`, `ports`, `importSceneTypes`,
 * `importSceneInstances`, `allPositions`, `allRotations`, `relationObjects`,
 * `codeEditorValue`, `runMechanism`), and `globalClassObject` /
 * `globalRelationclassObject`, whose lists and selections belong to the drawing
 * modes this client has no UI for. Resetting state nothing sets would only
 * suggest it is live.
 */
export async function resetEngineState(): Promise<void> {
  // --- 1. Selection ------------------------------------------------------
  // Before the scene it points into goes: the gizmo otherwise stays attached to
  // a mesh that has left the scene graph.
  globalObject.transformControls?.detach();
  globalSelectedObject.removeObject();

  // --- 2. The drawn preview ----------------------------------------------
  // `resetInstance` drops the registries of meshes, labels and ports the VizRep
  // executor built; the arrays below are what the raycasters pick from and what
  // the line updater walks, so they go with them.
  await graphicContext.resetInstance();
  globalObject.tabContext = [];
  globalObject.selectedTab = 0;
  globalObject.dragObjects = [];
  globalObject.updateLinesArray = [];
  globalObject.buttonObjects = [];
  globalObject.attribute_instances = [];
  globalObject.role_instances = [];
  globalObject.objectScaled = false;
  // The VizRep pipeline's "instance being drawn" pointers.
  globalObject.current_class_instance = undefined as unknown as typeof globalObject.current_class_instance;
  globalObject.current_port_instance = undefined as unknown as typeof globalObject.current_port_instance;
  globalObject.current_meta_port = undefined as unknown as typeof globalObject.current_meta_port;
  // The line a relation-class preview was drawing bendpoints onto.
  globalStateObject.activeStateLine = undefined;
  // The tree of scene types and their instances the preview navigated. The mock
  // scene type in `sceneTypes` is scaffolding and stays; this is the tree built
  // around it per preview, which `resetPreviewScene` rebuilds.
  globalObject.sceneTree = [];

  // A fresh empty scene, built the way every preview builds one — NOT a bare
  // `new THREE.Scene()`, which would drop the transform controls, the lights,
  // the grid, the 3D mouse pointer and the intersection plane the raycasters
  // need. `sceneInit` no-ops until the canvas has mounted, which is also when
  // there is nothing drawn to clear.
  await sceneInitiator.sceneInit();

  // --- 3. Caches and locks -----------------------------------------------
  // Files fetched with the departing user's token — the models and textures a
  // VizRep pulled in — must not be served to whoever signs in next.
  globalObject.localFiles.clear();
  // The live-preview lock. A sign-out landing mid-update would otherwise leave
  // it held, and `expression-utility` waits on it in a polling loop.
  globalObject.readyForVizRepUpdate = true;

  // --- 4. Preview mode ---------------------------------------------------
  // Back to the 3D default, matching `editorStore.reset()`. Assigned rather than
  // routed through `engine.setThreeDimensional`, which lives on the composition
  // root that imports this module's siblings; the camera and controls it would
  // swap are re-applied by the next `engine.mount()` regardless.
  globalObject.threeDimensional = true;
}

/**
 * Load-bearing module side effect: importing this file is what arms the engine
 * teardown, which is why `engine/index.ts` imports it — see the note there.
 *
 * The callback itself stays synchronous: `publish` runs listeners synchronously
 * and drops what they return, so a rejection from an `async` one would vanish
 * unhandled.
 */
eventBus.subscribe("login", (loggedIn) => {
  if (loggedIn) return;
  void resetEngineState().catch((error: unknown) => {
    console.error("Engine session teardown failed:", error);
  });
});
