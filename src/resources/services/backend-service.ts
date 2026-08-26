import { v4 as uuidv4 } from "uuid";
import { SceneType } from "@gds/models/meta/Metamodel_scenetypes.structure";
import { MetaObject, UUID } from "@gds/models/meta/Metamodel_metaobjects.structure";
import { SceneInstance } from "@gds/models/instance/Instance_scenes.structure";
import {
  META_TYPES,
  MetaTypeName,
  apiPathOf,
  metaTypeDescriptor,
  resolveMetaType,
} from "@/resources/meta-model/meta-types";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { useLogStore } from "@/resources/store/logStore";
import { useAuthStore } from "@/resources/store/authStore";
import { apiFetch, errorMessageOf } from "./api";
import { authHeaders } from "./auth-token";
import { dataUrlToFile } from "./helper-service";

/**
 * Every call this client makes to `mmar-server`.
 *
 * Requests are authenticated with the stored bearer token; a call made while
 * signed out returns an empty result instead of failing, because the left
 * navigation starts loading before the sign-in dialog has been dismissed.
 * Failures are logged and swallowed rather than propagated: no caller is in a
 * position to recover from them, and the log window is where the user looks.
 */

const log = (value: string, status: string) => useLogStore.getState().log(value, status);
const store = () => useSelectedObjectStore.getState();
const auth = () => useAuthStore.getState();

/**
 * The two ways a collection response departs from "a bare JSON array of the
 * objects as stored".
 *
 * Scene types arrive wrapped in an envelope, and are the only meta type revived
 * into its data-structure class — the rest stay plain JSON, which is why code
 * that inspects them dispatches on the store's `type` tag rather than on
 * `instanceof`.
 */
const RESPONSE_QUIRKS: Partial<
  Record<MetaTypeName, { envelope?: string; revive?: (json: unknown) => MetaObject }>
> = {
  SceneType: {
    envelope: "sceneTypes",
    revive: (json) => SceneType.fromJS(json) as SceneType,
  },
};

/** 1x1 grey PNG given to a newly created file object until one is uploaded. */
const PLACEHOLDER_FILE_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAAXNSR0IArs4c6QAAAHRJREFUGFcBaQCW/wFv8t3/dgt6AEF6ngAia2wA1JssAAEJ6en/UlQcAGqvmQAg5c4AkbeuAAFX1IH/Tn9jANk1ywD72+oAURLsAAHxiZj/HBd7AKuQXgBh1dgAZL+rAAH1ExD/AvgpACqw9wBrxn0AB3TZADviLEbMrYc8AAAAAElFTkSuQmCC";

/** Default attribute type assigned to a newly created attribute. */
const DEFAULT_ATTRIBUTE_TYPE_UUID = "85897325-c2b3-4ca7-8902-8120300a08dc";

/** Human-readable plural used in error messages, e.g. "scene types". */
const labelOf = (name: MetaTypeName) => META_TYPES[name].label.toLowerCase();

export class BackendService {
  /** Is the server reachable? Also the point at which an expired token logs out. */
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

  /**
   * Fetch every object of `type` and replace that collection in the store.
   * Returns the stored collection, or `[]` when signed out or on failure.
   */
  async loadObjects(type: string): Promise<MetaObject[]> {
    const name = resolveMetaType(type);
    const path = apiPathOf(type);
    if (!name || !path) {
      console.warn(`Unknown type: ${type}`);
      return [];
    }

    try {
      const headers = authHeaders();
      if (!headers) return [];

      const response = await apiFetch(path, { method: "GET", headers });
      if (!response.ok) {
        throw new Error(`${response.statusText} - ${await errorMessageOf(response)}`);
      }

      const { envelope, revive } = RESPONSE_QUIRKS[name] ?? {};
      const payload = await response.json();
      const rows: unknown[] = envelope ? payload[envelope] : payload;
      store().setObjects(revive ? rows.map(revive) : rows, name);
      return store().getObjects(name) ?? [];
    } catch (error) {
      log(`Error getting ${labelOf(name)}: ${error}`, "error");
      return [];
    }
  }

  getSceneTypes = () => this.loadObjects("SceneType");
  getClasses = () => this.loadObjects("Class");
  getRelationClasses = () => this.loadObjects("RelationClass");
  getAttributes = () => this.loadObjects("Attribute");
  getAttributeTypes = () => this.loadObjects("AttributeType");
  getPorts = () => this.loadObjects("Port");
  getFiles = () => this.loadObjects("File");
  getProcedures = () => this.loadObjects("Procedure");
  getUsers = () => this.loadObjects("User");
  getUserGroups = () => this.loadObjects("UserGroup");

  /** Download a stored file's bytes as a browser `File`. */
  async getFileByUUID(uuid: UUID): Promise<globalThis.File | undefined> {
    try {
      const response = await apiFetch(`metamodel/files/${uuid}`);
      if (!response.ok) {
        throw new Error(`${response.statusText} - ${await errorMessageOf(response)}`);
      }
      const blob = await response.blob();
      return new globalThis.File([blob], uuid, { type: blob.type });
    } catch (error) {
      log(`Error fetching endpoint: ${error}`, "error");
    }
  }

  /**
   * Create an empty object of `type` on the server and add it to the store.
   *
   * Most types are created by POSTing a uuid and a name to their own route. The
   * exceptions all come from the server's own shape: users are created through
   * the sign-up route, files need a real (placeholder) upload body, attributes
   * need a type to point at, and relation classes need both role ends to exist.
   */
  async createNewObject(type: string) {
    const descriptor = metaTypeDescriptor(type);
    if (!descriptor) {
      log(`Cannot create an object of unknown type: ${type}`, "error");
      return;
    }

    try {
      const headers = authHeaders();
      if (!headers) return;

      const generatedUuid = uuidv4();
      // The server-side default name keeps the plural REST segment it was
      // created through, e.g. "New classes".
      let content: Record<string, unknown> = {
        uuid: generatedUuid,
        name: `New ${descriptor.apiSegment}`,
      };
      let body: BodyInit;
      let url = `${apiPathOf(type)}/${generatedUuid}`;

      if (type === "File") {
        const formData = new FormData();
        formData.append(
          "file",
          await dataUrlToFile(PLACEHOLDER_FILE_DATA_URL, "placeholder.png", "image/png"),
        );
        formData.append("uuid", generatedUuid);
        formData.append("name", content.name as string);
        body = formData;
      } else {
        if (type === "Attribute") {
          content.attribute_type = { uuid: DEFAULT_ATTRIBUTE_TYPE_UUID };
        }
        if (type === "RelationClass") {
          content.role_from = { uuid: uuidv4() };
          content.role_to = { uuid: uuidv4() };
        }
        if (type === "User") {
          url = "login/signup";
          content = { username: "newuser", password: "newuser" };
        }
        body = JSON.stringify(content);
      }

      const response = await apiFetch(url, { method: "POST", headers, body });
      if (!response.ok) throw new Error(`Failed to create ${type}`);

      const created = await response.json();
      created.type = type;
      store().addObject(created, type);
      return created;
    } catch (error) {
      log(`Error creating new object: ${error}`, "error");
    }
  }

  /** Persist the object currently on screen. */
  async saveSelectedObject() {
    return this.saveObject(
      store().getSelectedObject() as MetaObject,
      store().getType() as string,
    );
  }

  /**
   * Persist one object.
   *
   * Split out of `saveSelectedObject` so a background tab can be saved — the
   * unsaved-changes prompt raised when closing it — without first having to make
   * it the active selection.
   */
  async saveObject(objectToSave: MetaObject, type: string) {
    const path = apiPathOf(type);
    if (!objectToSave || !path) return;

    try {
      const headers = authHeaders();
      if (!headers) return;

      const object = objectToSave as MetaObject & {
        compress?: boolean;
        targetWidth?: number;
        quality?: number;
      };
      // `hardpatch` makes the server mirror the payload exactly, deleting the
      // children and roles the object no longer carries.
      const query = new URLSearchParams({ hardpatch: "true" });
      if (type === "File" && object.compress) {
        query.set("compress", "true");
        query.set("targetWidth", String(object.targetWidth));
        query.set("quality", String(object.quality));
      }

      const response = await apiFetch(`${path}/${object.uuid}?${query}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(object),
      });
      if (!response.ok) throw new Error(`Failed to save ${type}`);

      log(`Object ${object.name} saved`, "info");
      const saved = await response.json();
      saved.type = type;
      store().updateLocalObject(saved);
      // The tab's working copy now matches the server: drop the unsaved marker.
      store().markTabClean(object.uuid);
      return saved;
    } catch (error) {
      log(`Error saving object: ${error}`, "error");
    }
  }

  async deleteObject(uuid: UUID, type: string) {
    const path = apiPathOf(type);
    if (!path) return;

    try {
      const headers = authHeaders();
      if (!headers) return;

      const response = await apiFetch(`${path}/${uuid}`, { method: "DELETE", headers });
      if (!response.ok) {
        throw new Error(`${response.statusText} - ${await errorMessageOf(response)}`);
      }
      store().removeObject(uuid);
      return response;
    } catch (error) {
      log(`Error deleting ${type}: ${error}`, "error");
    }
  }

  /**
   * Every scene instance built from `sceneTypeUUID`. Used by the 3D preview to
   * populate its mock scene.
   */
  async sceneInstancesAllGET(sceneTypeUUID: UUID): Promise<SceneInstance[]> {
    try {
      if (sceneTypeUUID === undefined || sceneTypeUUID === null) {
        throw new Error("The parameter 'sceneTypeUUID' must be defined.");
      }
      const headers = authHeaders();
      if (!headers) return [];

      const url = `instances/sceneTypes/${encodeURIComponent(sceneTypeUUID)}/sceneInstances`;
      const response = await apiFetch(url, { method: "GET", headers });
      if (!response.ok) {
        throw new Error(`${response.statusText} - ${await errorMessageOf(response)}`);
      }

      const data = await response.json();
      return Array.isArray(data)
        ? data.map((item) => SceneInstance.fromJS(item) as SceneInstance)
        : [];
    } catch (error) {
      log(`Error getting scene instances: ${error}`, "error");
      return [];
    }
  }
}

/** Application-wide instance; the service holds no per-caller state. */
export const backendService = new BackendService();
