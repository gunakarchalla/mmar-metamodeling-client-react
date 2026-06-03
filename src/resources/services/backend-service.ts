import { v4 as uuidv4 } from "uuid";
import { Class } from "@gds/models/meta/Metamodel_classes.structure";
import { SceneType } from "@gds/models/meta/Metamodel_scenetypes.structure";
import { AttributeType } from "@gds/models/meta/Metamodel_attributetypes.structure";
import { Attribute } from "@gds/models/meta/Metamodel_attributes.structure";
import { Relationclass } from "@gds/models/meta/Metamodel_relationclasses.structure";
import { Port } from "@gds/models/meta/Metamodel_ports.structure";
import { File } from "@gds/models/meta/Metamodel_files.structure";
import { Usergroup } from "@gds/models/meta/Metamodel_usergroups.structure";
import { User } from "@gds/models/meta/Metamodel_users.structure";
import { Role } from "@gds/models/meta/Metamodel_roles.structure";
import { MetaObject } from "@gds/models/meta/Metamodel_metaobjects.structure";
import { Procedure } from "@gds/models/meta/Metamodel_procedure.structure";
import { apiFetch } from "./api";
import { HelperService } from "./helper-service";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { useLogStore } from "@/resources/store/logStore";
import { useAuthStore } from "@/resources/store/authStore";

const log = (value: string, status: string) => useLogStore.getState().log(value, status);
const store = () => useSelectedObjectStore.getState();
const auth = () => useAuthStore.getState();

export class BackendService {
  private helperService = new HelperService();

  // test if the server is running
  async ping(): Promise<boolean | undefined> {
    try {
      if (auth().checkTokenAndLogoutIfExpired()) {
        auth().logout();
        return;
      }
      return (await apiFetch("test")).ok;
    } catch (error) {
      log(`Error testing server: ${error}`, "error");
    }
  }

  async getSceneTypes(): Promise<SceneType[] | undefined> {
    try {
      const sceneTypes: SceneType[] = [];
      const token = localStorage.getItem("auth_token");
      if (!token) return [];
      const response = await apiFetch("metamodel/sceneTypes", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        new Error("Failed to get scene types");
      } else {
        for (const sceneType of (await response.json()).sceneTypes) {
          sceneTypes.push(SceneType.fromJS(sceneType) as SceneType);
        }

        store().setSceneTypes(sceneTypes);
      }
      return store().getSceneTypes();
    } catch (error) {
      log(`Error getting scene types: ${error}`, "error");
    }
  }

  async getUserGroups(): Promise<Usergroup[]> {
    return this.fetchData<Usergroup>("usergroups", "UserGroup");
  }

  async getUsers(): Promise<User[]> {
    return this.fetchData<User>("users", "User");
  }

  async getClasses(): Promise<Class[]> {
    return this.fetchData<Class>("metamodel/classes", "Class");
  }

  async getAttributeTypes(): Promise<AttributeType[]> {
    return this.fetchData<AttributeType>("metamodel/attributeTypes", "AttributeType");
  }

  async getAttributes(): Promise<Attribute[]> {
    return this.fetchData<Attribute>("metamodel/attributes", "Attribute");
  }

  async getRelationClasses(): Promise<Relationclass[]> {
    return this.fetchData<Relationclass>("metamodel/relationclasses", "RelationClass");
  }

  async getPorts(): Promise<Port[]> {
    return this.fetchData<Port>("metamodel/ports", "Port");
  }

  async getFiles(): Promise<File[]> {
    return this.fetchData<File>("metamodel/files", "File");
  }

  async getFileByUUID(uuid: string): Promise<globalThis.File | undefined> {
    try {
      const response = await apiFetch(`metamodel/files/${uuid}`);
      if (!response.ok) {
        throw new Error(`${response.statusText} - ${await response.json()}`);
      }
      const blob = await response.blob();
      const file = new globalThis.File([blob], uuid, { type: blob.type });
      return file;
    } catch (error) {
      log(`Error fetching endpoint: ${error}`, "error");
    }
  }

  async patchFileByUUID(uuid: string, file: globalThis.File): Promise<string | undefined> {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) return;
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiFetch(`metamodel/files/${uuid}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`${response.statusText} - ${await response.json()}`);
      }
      return await response.json();
    } catch (error) {
      log(`Error patching file: ${error}`, "error");
    }
  }

  async getProcedures(): Promise<Procedure[]> {
    return this.fetchData<Procedure>("metamodel/procedures", "Procedure");
  }

  async getIndependentProcedures(): Promise<Procedure[]> {
    return this.fetchData<Procedure>("metamodel/independent_procedures", "Procedure");
  }

  async getUsersByUserGroupUuid(uuid: string): Promise<User[]> {
    return this.fetchData<User>(`users/usergroups/${uuid}`, "User");
  }

  async createNewObject(type: string) {
    try {
      const initialType = type;
      type = this.getCorrectType(type) as string;
      const token = localStorage.getItem("auth_token");
      const generatedUuid = uuidv4();
      const formData = new FormData();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let content: any = {
        uuid: generatedUuid,
        name: "New " + type,
      };

      if (type === "files") {
        const placeholderFile = await this.helperService.DataUrltoFile(
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAAXNSR0IArs4c6QAAAHRJREFUGFcBaQCW/wFv8t3/dgt6AEF6ngAia2wA1JssAAEJ6en/UlQcAGqvmQAg5c4AkbeuAAFX1IH/Tn9jANk1ywD72+oAURLsAAHxiZj/HBd7AKuQXgBh1dgAZL+rAAH1ExD/AvgpACqw9wBrxn0AB3TZADviLEbMrYc8AAAAAElFTkSuQmCC",
          "placeholder.png",
          "image/png",
        );

        formData.append("file", placeholderFile);
        formData.append("uuid", generatedUuid);
        formData.append("name", "New " + type);
      }

      if (type === "attributes") {
        content["attribute_type"] = {
          uuid: "85897325-c2b3-4ca7-8902-8120300a08dc",
        };
      }

      if (type === "relationclasses") {
        content["role_from"] = {
          uuid: uuidv4(),
        };
        content["role_to"] = {
          uuid: uuidv4(),
        };
      }

      let url = `metamodel/${type}/${generatedUuid}`;
      if (type === "userGroups") url = `${type}/${generatedUuid}`;
      if (type === "users") {
        url = `login/signup`;
        content = { username: "newuser", password: "newuser" };
      }
      const response = await apiFetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: type === "files" ? formData : JSON.stringify(content),
      });
      if (!response.ok) throw new Error(`Failed to create ${type}`);
      const toReturn = await response.json();
      toReturn.type = initialType;
      store().addObject(toReturn, initialType);
      return toReturn;
    } catch (error) {
      log(`Error creating new object: ${error}`, "error");
    }
  }

  async saveSelectedObject() {
    try {
      const initialType = store().getType() as string;
      const type = this.getCorrectType(initialType) as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const object = store().getSelectedObject() as any;
      const token = localStorage.getItem("auth_token");
      let url = `metamodel/${type}/${object.uuid}?hardpatch=true`;
      if (type === "users") url = `${type}/${object.uuid}?hardpatch=true`;
      if (type === "userGroups") url = `${type}/${object.uuid}?hardpatch=true`;
      if (type === "files") {
        if (object["compress"]) {
          url = `metamodel/files/${object.uuid}?hardpatch=true&compress=true&targetWidth=${object["targetWidth"]}&quality=${object["quality"]}`;
        }
      }
      const response = await apiFetch(url, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(object),
      });

      if (!response.ok) throw new Error(`Failed to get ${type}`);

      log(`Object ${object.name} saved`, "info");
      const toReturn = await response.json();
      toReturn.type = initialType;
      store().updateLocalObject(toReturn);
      return toReturn;
    } catch (error) {
      log(`Error saving object: ${error}`, "error");
    }
  }

  async postRole(): Promise<Role | undefined> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await apiFetch(`metamodel/roles/${uuidv4()}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to post role`);
      }
      return await response.json();
    } catch (error) {
      console.error("There was an error posting the role:", error);
    }
  }

  async getSpecificObject(
    uuid: string,
    type: string,
  ): Promise<{ MetaObject: MetaObject; Type: string } | undefined> {
    try {
      const initialType = type;
      type = this.getCorrectType(type) as string;
      const token = localStorage.getItem("auth_token");
      if (!token) return;
      let url = `metamodel/${type}/${uuid}`;
      if (type === "userGroups") url = `${type}/${uuid}`;
      if (type === "users") url = `${type}/uuid/${uuid}`;
      const response = await apiFetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to get ${type}`);
      }
      const returnedObject = await response.json();
      returnedObject.type = initialType;
      // update the object if it appears in the selected object service list
      store().updateLocalObject(returnedObject);
      return { MetaObject: returnedObject, Type: initialType };
    } catch (error) {
      log(`Error getting object: ${error}`, "error");
    }
  }

  async deleteObject(uuid: string, type: string) {
    try {
      type = this.getCorrectType(type) as string;
      const token = localStorage.getItem("auth_token");
      if (!token) return;
      let url = `metamodel/${type}/${uuid}`;
      if (type === "userGroups") url = `${type}/${uuid}`;
      if (type === "users") url = `${type}/${uuid}`;
      const response = await apiFetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error(`${response.statusText} - ${await response.json()}`);
      store().removeObject(uuid);

      return response;
    } catch (error) {
      log(`Error deleting ${type}: ${error}`, "error");
    }
  }

  async getObjects(type: string) {
    try {
      switch (type) {
        case "SceneType":
          return this.getSceneTypes();
        case "Class":
          return this.getClasses();
        case "RelationClass":
          return this.getRelationClasses();
        case "AttributeType":
          return this.getAttributeTypes();
        case "Attribute":
          return this.getAttributes();
        case "Port":
          return this.getPorts();
        case "File":
          return this.getFiles();
        case "Procedure":
          return this.getProcedures();
        case "UserGroup":
          return this.getUserGroups();
        case "User":
          return this.getUsers();

        default:
          console.warn(`Unknown type: ${type}`);
      }
    } catch (error) {
      console.error("There was an error getting the objects:", error);
    }
  }

  getCorrectType(type: string): string | undefined {
    switch (type) {
      case "SceneType":
        return "sceneTypes";
      case "Class":
        return "classes";
      case "RelationClass":
        return "relationclasses";
      case "AttributeType":
        return "attributeTypes";
      case "Attribute":
        return "attributes";
      case "Port":
        return "ports";
      case "File":
        return "files";
      case "Role":
        return "roles";
      case "Procedure":
        return "procedures";
      case "UserGroup":
        return "userGroups";
      case "User":
        return "users";
      default:
        console.warn(`Unknown type: ${type}`);
    }
  }

  private async fetchData<T>(endpoint: string, objectType: string): Promise<T[]> {
    try {
      const items: T[] = [];
      const token = localStorage.getItem("auth_token");
      if (!token) return [];
      const response = await apiFetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`${response.statusText} - ${await response.json()}`);
      }
      for (const item of await response.json()) {
        items.push(item);
      }
      store().setObjects(items, objectType);
      return store().getObjects(objectType) as T[];
    } catch (error) {
      log(`Error getting ${objectType.toLowerCase()}s: ${error}`, "error");
      return [];
    }
  }

  private async makeRequest<T>(endpoint: string): Promise<T | undefined> {
    try {
      const response = await apiFetch(endpoint);
      if (!response.ok) {
        throw new Error(`${response.statusText} - ${await response.json()}`);
      }
      return await response.json();
    } catch (error) {
      log(`Error fetching ${endpoint}: ${error}`, "error");
    }
  }
}

// Singleton instance (replaces the Aurelia @singleton DI registration).
export const backendService = new BackendService();
