import { UUID, Class, Relationclass, Port, SceneType, Attribute } from "@gds";
import { plainToInstance } from "class-transformer";
import { globalObject } from "@/engine/global-definition";
import { backendService } from "./backend-service";
import { fileUtility } from "./file-utility";

/**
 * Port of the old `meta_utility.ts`. DI stripped (globalObject / backendService /
 * fileUtility become module-singleton imports). `parseMetaFunction` keeps the
 * intentional `new Function(...)` eval used by the VizRep executor. Bodies
 * otherwise unchanged.
 */
export class MetaUtility {
  private globalObjectInstance = globalObject;

  private allFileUUIDS: string[] = []; // To store all file UUIDs

  async getAllFileUUIDs() {
    this.allFileUUIDS = await backendService.getAllFileUUIDs();
  }

  // Function to get all the files from the database
  async getAllFiles() {
    for (const uuid of this.allFileUUIDS) {
      const file = await backendService.getFileByUUID(uuid);
      // This client's backendService.getFileByUUID returns File | undefined
      // (the vizrep client's returned File). Skip missing files.
      if (!file) continue;
      let str: string;
      if (file.type.includes("model/gltf+json") || file.type.includes("application/octet-stream")) {
        str = await file.text();
      } else {
        str = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = typeof reader.result === "string" ? reader.result : "";
            resolve(result);
          };
          reader.onerror = (error) => {
            reject(error);
          };
          reader.readAsDataURL(file);
        });
      }
      await fileUtility.addFile(uuid, str);
    }
  }

  async getFileByUUID(uuid: UUID): Promise<string> {
    const file = await fileUtility.getFile(uuid);
    return file as string;
  }

  async getAllSceneTypesFromDB() {
    // NOTE: this client's backendService.getSceneTypes() already returns
    // SceneType[] | undefined (the vizrep client returned a Metamodel bundle with
    // a `.sceneTypes` field). Consume the array shape directly instead of `.sceneTypes`.
    const response = await backendService.getSceneTypes();
    const sceneTypes: SceneType[] = plainToInstance(SceneType, response ?? []);
    // add empty children array to sceneTypes
    for (const sceneType of sceneTypes) {
      (sceneType as any)["children"] = [];
    }
    return sceneTypes;
  }

  // Function to get current tab context scene type
  async getTabContextSceneType() {
    const tabContext = this.globalObjectInstance.tabContext[this.globalObjectInstance.selectedTab];
    const sceneType = tabContext.sceneType;
    return sceneType;
  }

  async getSceneTypeByUUID(uuid: UUID) {
    return this.globalObjectInstance.sceneTypes.find((sceneType) => sceneType.uuid == uuid);
  }

  // Function to find objects of a specific type within a given object and its children
  findType(object: any, type: any, objects: any[]) {
    for (const child of object.children) {
      if (child.type === type) {
        objects.push(child);
      }
      this.findType(child, type, objects);
    }
  }

  // Function to get the meta class based on its UUID
  async getMetaClass(uuid: UUID) {
    const sceneType = await this.getTabContextSceneType();
    const class_of_uuid = sceneType.classes.find((metaClass) => metaClass.uuid == uuid);
    return class_of_uuid;
  }

  // Function to get the meta relation class based on its UUID
  async getMetaRelationclass(uuid: UUID) {
    const sceneType = await this.getTabContextSceneType();
    const class_of_uuid = sceneType.relationclasses.find((metaClass) => metaClass.uuid == uuid);
    return class_of_uuid;
  }

  // Async function to get a metaPort by UUID
  async getMetaPort(uuid: UUID): Promise<Port | undefined> {
    let port_of_uuid: Port | undefined = undefined;
    const sceneType = await this.getTabContextSceneType();

    for (const metaClass of sceneType.classes) {
      // Check if class contains ports
      if (metaClass.ports) {
        // Check if class contains ports
        for (const metaPort of metaClass.ports) {
          if (metaPort.uuid == uuid) {
            port_of_uuid = metaPort;
          }
        }
      }
    }

    if (!port_of_uuid) {
      // Check if sceneType contains ports
      const sceneType = await this.getTabContextSceneType();
      if (sceneType.ports) {
        for (const metaPort of sceneType.ports) {
          if (metaPort.uuid == uuid) {
            port_of_uuid = metaPort;
          }
        }
      }
    }

    this.globalObjectInstance.current_meta_port = port_of_uuid as Port;

    if (!port_of_uuid) {
      return undefined;
    } else {
      return port_of_uuid;
    }
  }

  // Function to parse a string function to a JavaScript function
  async parseMetaFunction(stringFunction: string) {
    // Define function from string
    const f = new Function('"use strict";return (' + stringFunction + ")")();
    return f;
    //return Function('"use strict";return (' + stringFunction + ')')() as Function;
  }

  //check if input is sceneType
  checkIfSceneType(toBeDetermined: any): toBeDetermined is SceneType {
    if ((toBeDetermined as SceneType).classes) {
      return true;
    }
    return false;
  }

  //get metaAttribute by uuid
  async getMetaAttribute(uuid: UUID) {
    let metaAttribute: Attribute | undefined = undefined;
    //search in sceneType, classes, relationclasses
    const sceneType = await this.getTabContextSceneType();
    metaAttribute = sceneType.attributes.find((attribute) => attribute.uuid == uuid);
    if (!metaAttribute) {
      for (const metaClass of sceneType.classes) {
        metaAttribute = metaClass.attributes.find((attribute) => attribute.uuid == uuid);
        if (metaAttribute) {
          break;
        }
      }
    }
    if (!metaAttribute) {
      for (const metaRelationClass of sceneType.relationclasses) {
        metaAttribute = metaRelationClass.attributes.find((attribute) => attribute.uuid == uuid);
        if (metaAttribute) {
          break;
        }
      }
    }

    return metaAttribute;
  }

  // get metaAttribute by uuid from a specific class -> needed for sequence and ui-component
  async getMetaAttributeWithSequence(uuid: UUID, uuidAssignedConcept: UUID) {
    const metaClass = await this.getMetaClass(uuidAssignedConcept);
    const metaRelationClass = await this.getMetaRelationclass(uuidAssignedConcept);
    const metaPort = await this.getMetaPort(uuidAssignedConcept);
    const metaSceneType = await this.getSceneTypeByUUID(uuidAssignedConcept);

    let attribute: Attribute | undefined = undefined;
    metaClass ? (attribute = metaClass.attributes.find((attribute) => attribute.uuid == uuid)) : undefined;
    metaRelationClass
      ? (attribute = attribute
          ? attribute
          : metaRelationClass.attributes.find((attribute) => attribute.uuid == uuid))
      : undefined;
    metaPort
      ? (attribute = attribute ? attribute : metaPort.attributes.find((attribute) => attribute.uuid == uuid))
      : undefined;
    metaSceneType
      ? (attribute = attribute
          ? attribute
          : metaSceneType.attributes.find((attribute) => attribute.uuid == uuid))
      : undefined;
    return attribute;
  }
}

export const metaUtility = new MetaUtility();
