import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import {
  ClassInstance,
  RelationclassInstance,
  PortInstance,
  SceneInstance,
} from "@gds";
import {
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
  const rawGeometry = (selected.geometry as unknown as string | undefined)?.toString() ?? "";
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

  // --- reset engine + current-instance state (object-card.onButtonClicked) ---
  await graphicContext.resetInstance();
  globalObject.current_class_instance = null as unknown as ClassInstance;
  globalObject.current_port_instance = null as unknown as PortInstance;
  globalObject.scene = null as unknown as THREE.Scene;
  globalObject.sceneTree = null as unknown as typeof globalObject.sceneTree;
  globalObject.tabContext = [];

  // --- create a fresh mock scene instance, (re)init the scene + tab context ---
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
