import { UUID } from "@gds/models/meta/Metamodel_metaobjects.structure";
import { globalObject } from "@/engine/global-definition";
import { logger } from "./logger";
import { backendService } from "./backend-service";

/**
 * A cache of the files a VizRep pulls in while drawing — 3D models and textures,
 * keyed by uuid.
 *
 * VizReps request the same file on every redraw, so fetching it once and keeping
 * the decoded content in memory is what makes the live preview usable.
 */
export class FileUtility {
  private globalObjectInstance = globalObject;
  private logger = logger;

  /** Put `content` in the cache under `uuid`, replacing anything already there. */
  async addFile(uuid: UUID, content: string) {
    if (this.globalObjectInstance.localFiles.has(uuid)) {
      this.logger.log(`File with UUID ${uuid} already exists. Overwriting...`, "warn");
    } else {
      this.logger.log(`Adding new file with UUID ${uuid}.`, "info");
    }
    this.globalObjectInstance.localFiles.set(uuid, content);
  }

  /**
   * The cached content for `uuid`, fetching and caching it on a miss.
   *
   * Text-based formats (glTF JSON, raw binary streams) are decoded as text; the
   * rest become data URLs, which is what a texture is assigned from.
   */
  async getFile(uuid: UUID): Promise<string | undefined> {
    this.logger.log(`Retrieving file with UUID ${uuid}.`, "info");

    const cached = this.globalObjectInstance.localFiles.get(uuid);
    if (cached !== undefined) {
      this.logger.log(`File with UUID ${uuid} found in local storage.`, "info");
      return cached;
    }

    this.logger.log(
      `File with UUID ${uuid} not found in local storage. Fetching from server...`,
      "warn",
    );
    const file = await backendService.getFileByUUID(uuid);
    if (!file) {
      this.logger.log(`File with UUID ${uuid} could not be fetched from server.`, "warn");
      return undefined;
    }

    const isText =
      file.type.includes("model/gltf+json") || file.type.includes("application/octet-stream");
    const content = isText ? await file.text() : await readAsDataUrl(file);

    await this.addFile(uuid, content);
    this.logger.log(
      `File with UUID ${uuid} fetched from server and added to local storage.`,
      "info",
    );
    return content;
  }
}

function readAsDataUrl(file: globalThis.File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Application-wide cache; every VizRep draws from the same one. */
export const fileUtility = new FileUtility();
