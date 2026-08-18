import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import {
  Class,
  ClassInstance,
  Port,
  PortInstance,
  Relationclass,
  RelationclassInstance,
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

/**
 * Evaluate one layer of the stored geometry. The value on the object may itself
 * be an expression that yields the VizRep source, so it is unwrapped once before
 * being compiled.
 */
function parseObj(obj: string): string {
  return Function('"use strict";return (' + obj + ")")();
}

/**
 * A meta object's geometry as a string. The shared data structures type the
 * field as a function, but it holds source text at runtime.
 */
function geometryOf(object: { geometry?: unknown } | null | undefined): string {
  return (object?.geometry as string | undefined)?.toString() ?? "";
}

/**
 * Tear the engine's instance state down and rebuild an empty scene around
 * `sceneType`, leaving the canvas showing the bare grid for the caller to draw
 * into.
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

  // The engine navigates a tree of scene types and their instances; here that
  // tree holds exactly the one scene the preview draws into.
  (sceneType as unknown as { children: SceneInstance[] }).children = [sceneInstance];
  globalObject.sceneTypes = [sceneType];
  globalObject.sceneTree = [sceneType] as unknown as typeof globalObject.sceneTree;

  return sceneInstance;
}

/**
 * Empty the canvas back to the bare grid.
 *
 * A build that cannot compile the geometry returns *before* resetting, so the
 * last good render survives a half-typed keystroke. That is right while typing
 * and wrong on a selection change, where the previous object's render would
 * linger under the new object's name — so selecting clears explicitly when the
 * newly selected object has nothing to draw.
 */
export async function clearPreview(): Promise<void> {
  if (globalObject.sceneTypes.length === 0) return;
  await resetPreviewScene(globalObject.sceneTypes[0]);
  globalObject.render = true;
  eventBus.publish("removeAttributeGui");
}

/**
 * Draw the selected object into the 3D canvas.
 *
 * Builds a scene and a single instance of the object, runs its VizRep function
 * and renders the result. Reads the object from the selection store and the
 * scaffolding scene type the engine set up when it started; writes engine state
 * directly, since that is what the engine renders from.
 */
export async function runPreview(): Promise<void> {
  const store = useSelectedObjectStore.getState();
  const selected = store.getSelectedObject();

  if (!selected) {
    logger.log("No object selected to preview", "error");
    return;
  }

  // Dispatch on the store's `type` tag, never on `instanceof`: the backend
  // service pushes raw parsed JSON into the store — only scene types and scene
  // instances are ever revived into their classes — so a class, relation class
  // or port here is a plain object and every `instanceof` check would fail.
  //
  // It is also the same signal the General tab uses to decide whether to render
  // this block at all, so the two can never disagree about what is selected.
  const selectedType = store.type;
  // The scaffolding scene type is created when the engine starts up; without it
  // the canvas has not mounted yet.
  if (globalObject.sceneTypes.length === 0) {
    logger.log("Engine not ready for preview (canvas not mounted)", "error");
    return;
  }
  const sceneType = globalObject.sceneTypes[0];

  // Compile the geometry *before* touching engine state.
  //
  // Compiling only builds the VizRep function; running it comes later, so doing
  // this first changes nothing when the source is valid. When it is not, it is
  // the whole point: every keystroke is committed, so a half-typed snippet is
  // the normal state of the buffer, and resetting first would let one bad
  // character wipe the last good preview.
  const rawGeometry = geometryOf(selected);
  if (rawGeometry.trim().length === 0) {
    logger.log("Cannot preview: geometry is empty", "error");
    return;
  }

  // Typed as a string to match the engine's signature, which in fact receives
  // the compiled function object. The mismatch is the engine's; correcting it
  // belongs there rather than here.
  let metaFunction: string;
  try {
    metaFunction = await metaUtility.parseMetaFunction(parseObj(rawGeometry));
  } catch (err: unknown) {
    logger.log(`Cannot preview: geometry is not valid JavaScript — ${describeError(err)}`, "error");
    return;
  }

  // Copy the loaded metamodel onto the scaffolding scene type. Every concept
  // lookup the pipeline and the attribute controls make resolves against the
  // open scene type's own classes, relation classes and ports — so without this
  // it stays empty, the lookups return nothing, and building an instance throws.
  sceneType.classes = (store.getObjects("Class") ?? []) as Class[];
  sceneType.relationclasses = (store.getObjects("RelationClass") ?? []) as Relationclass[];
  sceneType.ports = (store.getObjects("Port") ?? []) as Port[];

  // --- reset engine state, then rebuild an empty scene to draw into ---
  await resetPreviewScene(sceneType);

  // --- create the one instance the preview shows ---
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

  // --- run the VizRep function compiled above ---
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

// Selections change faster than a preview builds, and every step of a build is
// asynchronous — so clicking three objects in a row would otherwise interleave
// three builds over the one shared engine, and the last render to finish would
// win rather than the last object clicked. The generation counter makes a
// superseded build drop out at its next await; the queue keeps two builds from
// running at once.
let generation = 0;
let queue: Promise<unknown> = Promise.resolve();

/**
 * Draw the currently selected object — the selection-change counterpart of the
 * Preview button.
 *
 * Reads the selection at draw time rather than taking it as an argument, so a
 * build that waited in the queue picks up the newest object, never a stale one.
 */
export function previewSelectedObject(): Promise<void> {
  const mine = ++generation;

  const run = queue.then(async () => {
    if (mine !== generation) return;
    // The scaffolding scene type only exists once the engine has started up. On
    // the very first selection the canvas has begun mounting but not finished,
    // so without this the build would bail out and the canvas would stay empty
    // until Preview was pressed.
    await engine.whenReady();
    if (mine !== generation) return;

    const selected = useSelectedObjectStore.getState().getSelectedObject();
    if (geometryOf(selected).trim().length === 0) {
      await clearPreview();
      return;
    }
    await runPreview();
  });

  // The queue must survive a failed build, so it chains the *caught* promise;
  // the caller still sees the rejection through the returned one.
  queue = run.catch(() => {});
  return run;
}
