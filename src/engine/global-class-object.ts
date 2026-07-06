import { UUID } from "@gds";
import { globalObject } from "@/engine/global-definition";
import { logger } from "@/resources/services/logger";
import { metaUtility } from "@/resources/services/meta-utility";

/**
 * Port of the old `resources/global_class_object.ts` (DI-stripping recipe):
 * GlobalDefinition / Logger / MetaUtility injections become module-singleton
 * imports. Bodies unchanged.
 */
export class GlobalClassObject {
  classUUID: UUID[];
  classNames: string[];
  classGeometry: string[];
  private selectedClass: string;
  private selectedClassUUID: UUID;

  private globalObjectInstance = globalObject;
  private logger = logger;
  private metaUtility = metaUtility;

  constructor() {
    this.classNames = [];
    this.classGeometry = [];
    this.selectedClass = "";
    this.selectedClassUUID = "";
    this.classUUID = [];
  }

  initClasses() {
    const tabContext = this.globalObjectInstance.tabContext[this.globalObjectInstance.selectedTab];
    const tabContextClasses = tabContext["sceneType"].classes;
    //for each class
    for (const element of tabContextClasses) {
      this.classNames.push(element.name);
      this.classGeometry.push(JSON.stringify(element.geometry));
      this.classUUID.push(element.uuid);
    }
  }

  onObjectChange() {
    // push to log file
    this.logger.log(`The selected object has changed to ${this.getSelectedClass()}`, "info");
  }
  getSelectedClass() {
    return this.selectedClass;
  }
  getSelectedClassUUID() {
    return this.selectedClassUUID;
  }
  setSelectedClass(index: number) {
    this.selectedClass = this.classNames[index];
    this.selectedClassUUID = this.classUUID[index];
    this.onObjectChange();
  }
  setSelectedClassByUUID(theUUID: string) {
    const index = this.classUUID.findIndex((uuid) => uuid === theUUID);
    this.selectedClass = this.classNames[index];
    this.selectedClassUUID = this.classUUID[index];
    this.onObjectChange();
  }

  async getIcon(wholeVizRep: string) {
    let vizRep: string = wholeVizRep;
    let map = "";
    let next = false;

    //if icon defined
    vizRep = wholeVizRep.split("let icon")[1];
    if (vizRep) {
      const arrStr: string[] = vizRep.split("'");
      for (const substring of arrStr) {
        const string: string = substring;
        if (string.startsWith("data")) {
          map = string;
          return map;
        } else if (string.endsWith("getFile(")) {
          next = true;
        } else if (next) {
          const str = await this.metaUtility.getFileByUUID(string);
          map = str;
          break;
        }
      }
    }

    //if icon not defined try to take map
    if (map == "") {
      vizRep = wholeVizRep.split("let map")[1];
      if (vizRep) {
        const arrStr: string[] = vizRep.split("'");
        for (const substring of arrStr) {
          const string: string = substring;
          if (string.startsWith("data")) {
            map = string;
            return map;
          }
        }
      }
    }

    return map;
  }
}

// Module singleton (replaces the Aurelia @singleton() DI registration).
export const globalClassObject = new GlobalClassObject();
