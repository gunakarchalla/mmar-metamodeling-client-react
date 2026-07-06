import { UUID } from "@gds/models/meta/Metamodel_metaobjects.structure";
import { globalObject } from "@/engine/global-definition";
import { logger } from "./logger";
import { backendService } from "./backend-service";

/**
 * Port of the old `fileUtility.ts`. Local file cache (UUID -> content string)
 * backed by the server when missing. DI is stripped (constructor deps become
 * module-singleton imports); body unchanged otherwise.
 */
export class FileUtility {
  private globalObjectInstance = globalObject;
  private logger = logger;

  async addFile(uuid: UUID, content: string) {
    // Check if the file already exists
    if (this.globalObjectInstance.localFiles.has(uuid)) {
      this.logger.log(`File with UUID ${uuid} already exists. Overwriting...`, "warn");
    } else {
      this.logger.log(`Adding new file with UUID ${uuid}.`, "info");
    }
    this.globalObjectInstance.localFiles.set(uuid, content);
  }

  async getFile(uuid: UUID): Promise<string | undefined> {
    this.logger.log(`Retrieving file with UUID ${uuid}.`, "info");

    if (this.globalObjectInstance.localFiles.has(uuid)) {
      this.logger.log(`File with UUID ${uuid} found in local storage.`, "info");
      return this.globalObjectInstance.localFiles.get(uuid);
    } else {
      // If the file is not found in local storage, fetch it from the server
      this.logger.log(
        `File with UUID ${uuid} not found in local storage. Fetching from server...`,
        "warn",
      );
      const file = await backendService.getFileByUUID(uuid);
      // This client's backendService.getFileByUUID returns File | undefined
      // (the vizrep client's returned File). Bail out if the file is missing.
      if (!file) {
        this.logger.log(`File with UUID ${uuid} could not be fetched from server.`, "warn");
        return undefined;
      }

      //convert the file to a string
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
      this.addFile(uuid, str);
      this.logger.log(
        `File with UUID ${uuid} fetched from server and added to local storage.`,
        "info",
      );
      return str;
    }
  }
}

export const fileUtility = new FileUtility();
