import * as THREE from "three";
import { globalObject } from "@/engine/global-definition";

/**
 * Port of the old `resources/global_selected_object.ts` (DI-stripping recipe):
 * `@singleton()` + the Aurelia GlobalDefinition injection are replaced by the
 * `globalObject` module singleton. Bodies are unchanged — the boxHelper logic was
 * already commented out in the original (selection highlighting is a no-op), so the
 * helper methods stay as no-ops to preserve behaviour exactly.
 */
export class GlobalSelectedObject {
  public object: THREE.Mesh = new THREE.Mesh();

  private globalObjectInstance = globalObject;

  getObject() {
    this.updateSelectionBoxHelper(this.object);
    return this.object;
  }

  setObject(object: THREE.Mesh) {
    this.removeObject();
    if (this.globalObjectInstance.boxHelper != undefined) {
      this.object = object;
      this.updateSelectionBoxHelper(object);
    } else {
      this.object = object;
      this.initSelectionBoxHelper(object);
    }
  }

  removeObject() {
    this.object = undefined as any;
    this.removeSelectionBoxHelper();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initSelectionBoxHelper(object: THREE.Mesh) {
    // this.globalObjectInstance.boxHelper = new THREE.BoxHelper(object, 'red');
    // this.globalObjectInstance.scene.add(this.globalObjectInstance.boxHelper);
    // this.updateSelectionBoxHelper(object);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updateSelectionBoxHelper(object: THREE.Mesh) {
    // this.globalObjectInstance.boxHelper.setFromObject(object);
    // this.globalObjectInstance.boxHelper.update();
  }
  removeSelectionBoxHelper() {
    // this.globalObjectInstance.scene.remove(this.globalObjectInstance.boxHelper);
    // this.globalObjectInstance.boxHelper = undefined;
  }
}

// Module singleton (replaces the Aurelia @singleton() DI registration).
export const globalSelectedObject = new GlobalSelectedObject();
