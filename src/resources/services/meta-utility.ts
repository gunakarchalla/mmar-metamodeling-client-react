import { UUID, Port, SceneType, Attribute } from "@gds";
import { plainToInstance } from "class-transformer";
import { globalObject } from "@/engine/global-definition";
import { backendService } from "./backend-service";
import { fileUtility } from "./file-utility";

/** Anything the tree walker below can descend through. */
interface TreeNode {
  type?: string;
  children?: TreeNode[];
}

/**
 * Lookups against the metamodel that the 3D engine and the VizRep executor need
 * while drawing: resolving a concept by uuid inside the scene type currently
 * open, loading referenced files, and compiling a VizRep source string into the
 * function that draws it.
 */
export class MetaUtility {
  private globalObjectInstance = globalObject;

  async getFileByUUID(uuid: UUID): Promise<string> {
    const file = await fileUtility.getFile(uuid);
    return file as string;
  }

  /** Every scene type on the server, ready to seed the engine's scene tree. */
  async getAllSceneTypesFromDB() {
    const response = await backendService.getSceneTypes();
    const sceneTypes: SceneType[] = plainToInstance(SceneType, response ?? []);
    // The engine's tree walker expects every node to have a children array.
    for (const sceneType of sceneTypes) {
      (sceneType as unknown as { children: unknown[] }).children = [];
    }
    return sceneTypes;
  }

  /** The scene type behind the tab the engine is currently rendering. */
  async getTabContextSceneType() {
    const tabContext = this.globalObjectInstance.tabContext[this.globalObjectInstance.selectedTab];
    const sceneType = tabContext.sceneType;
    return sceneType;
  }

  async getSceneTypeByUUID(uuid: UUID) {
    return this.globalObjectInstance.sceneTypes.find((sceneType) => sceneType.uuid == uuid);
  }

  /**
   * Collect, into `objects`, every descendant of `object` whose `type` matches.
   * Walks anything with a `children` array — three.js scene graphs as well as
   * the metamodel tree.
   */
  findType(object: TreeNode, type: string, objects: TreeNode[]) {
    for (const child of object.children ?? []) {
      if (child.type === type) {
        objects.push(child);
      }
      this.findType(child, type, objects);
    }
  }

  /** The class with `uuid` declared by the open scene type. */
  async getMetaClass(uuid: UUID) {
    const sceneType = await this.getTabContextSceneType();
    const class_of_uuid = sceneType.classes.find((metaClass) => metaClass.uuid == uuid);
    return class_of_uuid;
  }

  /** The relation class with `uuid` declared by the open scene type. */
  async getMetaRelationclass(uuid: UUID) {
    const sceneType = await this.getTabContextSceneType();
    const class_of_uuid = sceneType.relationclasses.find((metaClass) => metaClass.uuid == uuid);
    return class_of_uuid;
  }

  /** The port with `uuid`, looked up on the open scene type's classes then on itself. */
  async getMetaPort(uuid: UUID): Promise<Port | undefined> {
    const sceneType = await this.getTabContextSceneType();
    const candidates = [
      ...sceneType.classes.flatMap((metaClass) => metaClass.ports ?? []),
      ...(sceneType.ports ?? []),
    ];
    const port = candidates.find((metaPort) => metaPort.uuid == uuid);

    // The engine reads the last resolved port back off the global state.
    this.globalObjectInstance.current_meta_port = port as Port;
    return port;
  }

  /**
   * Compile a VizRep source string into the function it declares.
   *
   * VizReps are user-authored JavaScript stored on the meta object, so
   * evaluating them is the feature, not an oversight. Callers are expected to
   * catch: half-typed source is the normal state of the editor buffer.
   */
  async parseMetaFunction(stringFunction: string) {
    return new Function('"use strict";return (' + stringFunction + ")")();
  }

  /** The attribute with `uuid`, declared by the open scene type or any of its concepts. */
  async getMetaAttribute(uuid: UUID) {
    const sceneType = await this.getTabContextSceneType();
    const declared: Attribute[] = [
      ...sceneType.attributes,
      ...sceneType.classes.flatMap((metaClass) => metaClass.attributes),
      ...sceneType.relationclasses.flatMap((metaRelationClass) => metaRelationClass.attributes),
    ];
    return declared.find((attribute) => attribute.uuid == uuid);
  }
}

export const metaUtility = new MetaUtility();
