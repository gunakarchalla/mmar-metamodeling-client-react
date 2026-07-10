import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import {
  ClassInstance,
  RelationclassInstance,
  PortInstance,
  SceneInstance,
  SceneType,
} from "@gds";
import {
  engine,
  globalObject,
  graphicContext,
  sceneInitiator,
  instanceCreationHandler,
  globalSelectedObject,
  lineUpdateService,
} from "@/engine";
import { metaUtility } from "@/resources/services/meta-utility";
import { instanceUtility } from "@/resources/services/instance-utility";
import { logger } from "@/resources/services/logger";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { eventBus } from "@/resources/services/event-bus";
import { describeError } from "@/resources/util/describe-error";

// `parseObj` from the old object-card: the geometry string may itself be a JS
// expression that needs one eval pass before it is handed to parseMetaFunction.
function parseObj(obj: string): string {
  return Function('"use strict";return (' + obj + ")")();
}

/** The geometry a meta object carries, as a string (gds types it `Function`, §4.4). */
function geometryOf(object: { geometry?: unknown } | null | undefined): string {
  return (object?.geometry as string | undefined)?.toString() ?? "";
}

/**
 * Tear the engine's instance state down and rebuild an empty mock scene around
 * `sceneType` (the old `object-card.onButtonClicked` reset + `initTree`). Leaves the
 * canvas showing the bare grid; the caller draws into it.
 */
async function resetPreviewScene(sceneType: SceneType): Promise<SceneInstance> {
  await graphicContext.resetInstance();
  globalObject.current_class_instance = null as unknown as ClassInstance;
  globalObject.current_port_instance = null as unknown as PortInstance;
  globalObject.scene = null as unknown as THREE.Scene;
  globalObject.sceneTree = null as unknown as typeof globalObject.sceneTree;
  globalObject.tabContext = [];

  const sceneInstance = new SceneInstance(instanceCreationHandler.create_UUID(), sceneType.uuid);
  sceneInstance.name = "MockSceneInstance";
  logger.log(`SceneInstance with name ${sceneInstance.name} created`, "info");

  await sceneInitiator.sceneInit();
  await instanceUtility.createTabContextSceneInstance(sceneInstance);
  globalObject.selectedTab = 0;

  // --- mock scene tree (object-card.initTree) ---
  (sceneType as unknown as { children: SceneInstance[] }).children = [sceneInstance];
  globalObject.sceneTypes = [sceneType];
  globalObject.sceneTree = [sceneType] as unknown as typeof globalObject.sceneTree;

  return sceneInstance;
}

/**
 * Empty the canvas back to the bare grid.
 *
 * `runPreview` deliberately returns *before* the reset when the geometry does not
 * compile, so the last good render survives a half-typed keystroke (D2 live commit).
 * That is right while typing and wrong on a selection change: the previous object's
 * render would linger under the new object's name. So the selection path clears
 * explicitly when the newly selected object has nothing to draw.
 */
export async function clearPreview(): Promise<void> {
  if (globalObject.sceneTypes.length === 0) return;
  await resetPreviewScene(globalObject.sceneTypes[0]);
  globalObject.render = true;
  eventBus.publish("removeAttributeGui");
}

/**
 * The VizRep preview pipeline — a faithful port of the old
 * `views/object-card/object-card.ts` `onButtonClicked()` build flow, decoupled
 * from the card. In the old client this ran on every card click; here it is the
 * Preview button's action (plan §308/§315/§316 "Done when"): selecting an object
 * loads its code (P7), and clicking Preview builds the mock scene + instance,
 * runs the VizRep function and draws the result into the live 3D canvas.
 *
 * Reads the currently selected meta object (whose `.geometry` the editor flushed
 * via the previewButtonClicked -> updatedGeometryValue handshake) from
 * selectedObjectStore, and the mock SceneType/Class set up at engine mount from
 * globalObject. Mutates engine state directly (the engine reads globalObject.*).
 */
export async function runPreview(): Promise<void> {
  const store = useSelectedObjectStore.getState();
  const selected = store.getSelectedObject();

  if (!selected) {
    logger.log("No object selected to preview", "error");
    return;
  }

  // Dispatch on the store's `type` discriminator, NOT on `instanceof`.
  //
  // vizrep's backend-service hydrated every response (`data.map(Class.fromJS)`), so
  // its store held real gds instances and `selected instanceof Class` held. This
  // client's `backendService.fetchData()` pushes the raw parsed JSON straight into
  // the store (only SceneType and SceneInstance are ever run through `fromJS`), so
  // Classes / Relationclasses / Ports are plain objects whose prototype is
  // `Object.prototype`. Every `instanceof` check therefore fell through to the
  // "not a Class, RelationClass or Port" branch and the preview silently drew
  // nothing — for all three types.
  //
  // `type` is the same signal GeneralTab uses to decide whether to render this
  // block at all, so the two can never disagree about what is selected.
  const selectedType = store.type;
  // The mock SceneType is created during initiator.init() at engine mount; if it
  // is missing the canvas has not mounted yet.
  if (globalObject.sceneTypes.length === 0) {
    logger.log("Engine not ready for preview (canvas not mounted)", "error");
    return;
  }
  const sceneType = globalObject.sceneTypes[0];

  // Compile the user-authored geometry BEFORE touching engine state.
  //
  // Both `parseObj` and `parseMetaFunction` are pure `new Function(...)` evaluations
  // (they build the VizRep function; `runVizRepFunction` is what executes it), so
  // hoisting them above the reset below is behaviour-preserving on the happy path.
  // On the failure path it is the whole point: geometry is live-committed on every
  // keystroke (D2), so a half-typed snippet is the normal state of the buffer. If we
  // reset first and parse second, one bad character both throws and wipes the last
  // good preview. Parsing first leaves the canvas showing the last good render.
  const rawGeometry = geometryOf(selected);
  if (rawGeometry.trim().length === 0) {
    logger.log("Cannot preview: geometry is empty", "error");
    return;
  }

  // Typed `string` to match `graphicContext.runVizRepFunction(vizRepCode: string)`,
  // which in fact receives the compiled function object — a pre-existing signature
  // lie in the engine, preserved here rather than "fixed".
  let metaFunction: string;
  try {
    metaFunction = await metaUtility.parseMetaFunction(parseObj(rawGeometry));
  } catch (err: unknown) {
    logger.log(`Cannot preview: geometry is not valid JavaScript — ${describeError(err)}`, "error");
    return;
  }

  // Bridge the loaded meta objects (selectedObjectStore) onto the mock SceneType.
  // Every meta lookup used by the pipeline and the attribute window —
  // metaUtility.getMetaClass / getMetaRelationclass / getMetaPort — resolves the
  // concept from `tabContext.sceneType.{classes,relationclasses,ports}`, and the
  // tab-context scene type IS this mock SceneType. The old client wired this once
  // in `left-nav.ts` (`sceneType.classes = classes; sceneType.relationclasses =
  // relationClasses; sceneType.ports = ports;`); the React LeftNav only fills the
  // store, so without this the mock SceneType stays empty, getMetaClass returns
  // undefined, and createClassInstance throws on `metaclass.name` — which broke
  // both the 3D preview and the (preview-driven) attribute window.
  sceneType.classes = store.getClasses();
  sceneType.relationclasses = store.getRelationClasses();
  sceneType.ports = store.getPorts();

  // --- reset engine state, then rebuild an empty mock scene + tab context ---
  await resetPreviewScene(sceneType);

  // --- create the instance for the selected meta object ---
  let instance: ClassInstance | RelationclassInstance | PortInstance;
  if (selectedType === "RelationClass") {
    instance = await instanceCreationHandler.createRelationclassInstance(
      instanceCreationHandler.create_UUID(),
      0,
      0,
      0,
      selected.uuid,
      "relation",
    );
    globalObject.current_class_instance = instance as ClassInstance;
  } else if (selectedType === "Class") {
    instance = await instanceCreationHandler.createClassInstance(
      instanceCreationHandler.create_UUID(),
      0,
      0,
      0,
      selected.uuid,
      "class",
    );
    globalObject.current_class_instance = instance as ClassInstance;
  } else if (selectedType === "Port") {
    const portSceneInstance = await instanceUtility.getTabContextSceneInstance();
    instance = await instanceCreationHandler.createPortInstance(
      instanceCreationHandler.create_UUID(),
      selected.uuid,
      globalObject.mockClassInstance,
      portSceneInstance!,
    );
    globalObject.current_port_instance = instance as PortInstance;
    portSceneInstance!.port_instances = [instance as PortInstance];
  } else {
    logger.log("Selected object is not a Class, RelationClass or Port", "error");
    return;
  }

  // --- evaluate the dynamic VizRep function (compiled above, before the reset) ---
  await graphicContext.resetInstance();
  await graphicContext.runVizRepFunction(metaFunction);

  // --- draw ---
  let classObject3D;
  if (selectedType === "RelationClass") {
    const startObjecPoint: THREE.Vector3 = new THREE.Vector3(-1, 0, 0);
    const endObjectPoint: THREE.Vector3 = new THREE.Vector3(1, 0, 0);

    // small spheres to visualize the relation start/end points
    const startSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff0000 }),
    );
    const endSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 }),
    );
    startSphere.position.x = startObjecPoint.x - 0.1;
    startSphere.position.y = startObjecPoint.y;
    startSphere.position.z = startObjecPoint.z;
    endSphere.position.x = endObjectPoint.x + 0.1;
    endSphere.position.y = endObjectPoint.y;
    endSphere.position.z = endObjectPoint.z;

    globalObject.scene.add(startSphere, endSphere);

    classObject3D = await graphicContext.drawVizRep_rel();

    const correspondingSceneObject = globalObject.scene.getObjectByProperty(
      "uuid",
      globalObject.current_class_instance.uuid,
    );

    // set fromObject and toObject
    instanceCreationHandler.addPointToClassInstance(instance as RelationclassInstance, startSphere);
    instanceCreationHandler.addPointToClassInstance(instance as RelationclassInstance, endSphere);

    // add line points
    instanceCreationHandler.addLinePoint(
      (correspondingSceneObject as Line2) ?? null,
      startObjecPoint,
      startSphere,
    );
    instanceCreationHandler.addLastLinePoint(correspondingSceneObject as Line2, endSphere);

    // set the start and end position of the line2
    lineUpdateService.setPos(correspondingSceneObject as Line2);
    globalObject.render = true;
  } else {
    classObject3D = await graphicContext.drawVizRep(new THREE.Vector3(0, 0, 0), instance as ClassInstance);
    globalObject.render = true;
  }

  globalSelectedObject.setObject(classObject3D as THREE.Mesh);

  eventBus.publish("removeAttributeGui");
  setTimeout(() => {
    eventBus.publish("updateAttributeGui");
  }, 100);
}

// Selection changes faster than a preview builds: every step of runPreview is async
// (createClassInstance, runVizRepFunction, the GLTF/troika loads inside drawVizRep), so
// clicking three cards in a row would otherwise interleave three builds over the one
// shared globalObject — the last render to finish wins, and it is not necessarily the
// last object clicked. `generation` makes a superseded build drop out at its next await
// point; the queue keeps two builds from ever running concurrently.
let generation = 0;
let queue: Promise<unknown> = Promise.resolve();

/**
 * Draw the currently selected object into the preview canvas — the selection-change
 * counterpart of the Preview button.
 *
 * Without this the canvas only ever changed when Preview was clicked: selecting an
 * object showed an empty canvas, and selecting a second object left the first one's
 * render on screen while every other field switched.
 *
 * Reads the selection at draw time rather than taking it as an argument, so a build
 * that waited in the queue picks up the newest object, never a stale one.
 */
export function previewSelectedObject(): Promise<void> {
  const mine = ++generation;

  const run = queue.then(async () => {
    if (mine !== generation) return;
    // globalObject.sceneTypes[0] (the mock SceneType) only exists after the engine's
    // one-time init. On the very first selection ThreeCanvas has started mounting but
    // not finished, so without this await runPreview would bail out with "Engine not
    // ready" and the canvas would stay empty until the user clicked Preview.
    await engine.whenReady();
    if (mine !== generation) return;

    const selected = useSelectedObjectStore.getState().getSelectedObject();
    if (geometryOf(selected).trim().length === 0) {
      await clearPreview();
      return;
    }
    await runPreview();
  });

  // The queue must survive a failed build, so it chains the *caught* promise; the
  // caller still sees the rejection through the returned one.
  queue = run.catch(() => {});
  return run;
}
