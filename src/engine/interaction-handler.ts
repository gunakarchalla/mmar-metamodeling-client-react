import * as THREE from "three";
import { globalObject } from "@/engine/global-definition";
import { rayHelper } from "@/engine/ray-helper";

/**
 * Full Phase 5 port of the old `resources/interaction_handler.ts` (DI-stripping
 * recipe). The original class only defines `onDocumentMouseDown` (the
 * `pointerdown` listener wired by the initiator) + the `parseObj` helper; its
 * unused GraphicContext / utility / EventAggregator injections are dropped. Bodies
 * unchanged.
 */
export class InteractionHandler {
  private objects: THREE.Mesh[];
  private intersects: THREE.Intersection[];
  private intersect: THREE.Intersection;

  // get programState
  private programState: string;

  // check variable
  private allowed = true;
  private dragging: boolean;

  // left == 0, right == 2
  private clickedButton: number;

  private globalObjectInstance = globalObject;
  private rayHelper = rayHelper;

  // function that is called on mouse click
  // ------------------------------------
  // check sequence diagram in the wiki of mm-ar: https://github.com/MM-AR/mmar/wiki/InteractionHandler
  // ------------------------------------
  async onDocumentMouseDown(event: MouseEvent) {
    this.clickedButton = event.button;
    this.dragging = this.globalObjectInstance.transformControls.dragging;

    // set the raycaster
    this.globalObjectInstance.raycaster = this.rayHelper.shootRay(event);
  }

  // -------------------------------------------------
  // helper functions
  // -------------------------------------------------
  parseObj(obj: string) {
    const ret: string = Function('"use strict";return (' + obj + ")")();
    return ret;
  }
}

// Module singleton (replaces the Aurelia @singleton() DI registration).
export const interactionHandler = new InteractionHandler();
