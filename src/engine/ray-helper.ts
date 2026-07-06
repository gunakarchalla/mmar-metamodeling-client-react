import * as THREE from "three";
import { globalObject } from "@/engine/global-definition";

/**
 * Port of the old `ray_helper.ts`. DI stripped (P3 recipe): the Aurelia
 * `@singleton()` + constructor-injected `GlobalDefinition` become a module
 * singleton import. Body unchanged.
 */
export class RayHelper {
  private globalObjectInstance = globalObject;

  // generate a raycast that shoots a ray from the camera to the mouse position
  // returns the raycaster
  shootRay(event: MouseEvent | TouchEvent): THREE.Raycaster {
    // calculate the x and y position of the mouse on the renderer
    const ev: any = event;
    let clientX: number | undefined;
    let clientY: number | undefined;

    // for touch
    try {
      clientX = ev.touches[0].clientX;
      clientY = ev.touches[0].clientY;
    } catch {
      /* not a touch event */
    }

    const rect: DOMRect = this.globalObjectInstance.renderer.domElement.getBoundingClientRect();

    // for touch
    if (clientX && clientY) {
      this.globalObjectInstance.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      this.globalObjectInstance.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    }
    // if not touch
    else {
      this.globalObjectInstance.mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      this.globalObjectInstance.mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    }

    // Raycaster from Camera to mouseposition
    this.globalObjectInstance.raycaster.setFromCamera(this.globalObjectInstance.mouse, this.globalObjectInstance.camera);

    return this.globalObjectInstance.raycaster;
  }

  shootRayFromObject(fromObject: THREE.Mesh, toObject: THREE.Mesh) {
    const direction = new THREE.Vector3();
    const fromPosition: THREE.Vector3 = new THREE.Vector3();
    const toPosition: THREE.Vector3 = new THREE.Vector3();

    // we get the world position of the two
    fromObject.getWorldPosition(fromPosition);
    toObject.getWorldPosition(toPosition);

    const adaptedFromPosition = fromPosition;
    direction.subVectors(toPosition, adaptedFromPosition);
    this.globalObjectInstance.raycasterBetweenObjects.set(adaptedFromPosition, direction.normalize());
    const intersects = this.globalObjectInstance.raycasterBetweenObjects.intersectObject(toObject);
    if (intersects[0]) return intersects[0].point;
  }
}

// Module singleton (replaces the Aurelia @singleton() DI registration).
export const rayHelper = new RayHelper();
