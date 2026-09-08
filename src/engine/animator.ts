import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { globalObject } from "@/engine/global-definition";

/**
 * Port of the old `animator.ts`. DI stripped (P3 recipe): GlobalDefinition
 * becomes a module-singleton import (the unused RayHelper dep is dropped, and
 * the InstanceUtility one went with the dead per-frame lookup below).
 */
export class Animator {
  private globalObjectInstance = globalObject;

  /**
   * The per-frame tick, driven by `renderer.setAnimationLoop`.
   *
   * Kept synchronous on purpose. It used to `await` the tab context's scene
   * instance on every frame — roughly sixty times a second — and then never read
   * the result: the value was assigned to a local and dropped. Each of those
   * awaits also cost a promise and a microtask turn on the frame budget, and
   * `getTabContextSceneInstance` writes a log line when it finds nothing, so on
   * any frame without a loaded scene the render loop was also driving the log
   * store (and every component subscribed to it) at frame rate.
   */
  animate() {
    if (this.globalObjectInstance.render) {
      this.globalObjectInstance.render = false;
      this.globalObjectInstance.renderer.render(this.globalObjectInstance.scene, this.globalObjectInstance.camera);

      ////////////////////////////////////////
      // if normal camera is active
      ////////////////////////////////////////

      if (this.globalObjectInstance.camera == this.globalObjectInstance.normalCamera && this.globalObjectInstance.tabContext.length > 0) {
        // update for orbit controls
        if (this.globalObjectInstance.camera == this.globalObjectInstance.normalCamera) this.globalObjectInstance.orbitControls.update();
      }
    }
  }

  // This method calculates the middle point of a line. It is used in the setPos method to update the position of the line.
  async calculateMiddlePoint(line: Line2, pos: number[]) {
    // calculate middle point of the line
    // Step 1: Compute total length of the line
    let totalLength = 0;
    const segmentLengths: number[] = []; // Store individual segment lengths

    for (let i = 3; i < pos.length; i += 3) {
      const p1 = new THREE.Vector3(pos[i - 3], pos[i - 2], pos[i - 1]);
      const p2 = new THREE.Vector3(pos[i], pos[i + 1], pos[i + 2]);

      const segmentLength = p1.distanceTo(p2);
      segmentLengths.push(segmentLength);
      totalLength += segmentLength;
    }

    // Step 2: Find the segment where the half-length occurs
    const halfLength = totalLength / 2;
    let accumulatedLength = 0;
    let targetIndex = 0;

    for (let i = 0; i < segmentLengths.length; i++) {
      accumulatedLength += segmentLengths[i];
      if (accumulatedLength >= halfLength) {
        targetIndex = i;
        break;
      }
    }

    // Step 3: Interpolate the exact halfway position
    const p1 = new THREE.Vector3(pos[targetIndex * 3], pos[targetIndex * 3 + 1], pos[targetIndex * 3 + 2]);
    const p2 = new THREE.Vector3(pos[targetIndex * 3 + 3], pos[targetIndex * 3 + 4], pos[targetIndex * 3 + 5]);

    const remainingDistance = halfLength - (accumulatedLength - segmentLengths[targetIndex]);
    const ratio = remainingDistance / segmentLengths[targetIndex]; // Ratio for interpolation

    const midPoint = new THREE.Vector3().lerpVectors(p1, p2, ratio);
    // add midPoint to userData to use it somewhere else
    line.userData.midPoint = midPoint;
  }
}

// Module singleton (replaces the Aurelia @singleton() DI registration).
export const animator = new Animator();
