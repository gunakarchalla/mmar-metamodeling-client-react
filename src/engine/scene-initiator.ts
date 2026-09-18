import * as THREE from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { globalObject } from "@/engine/global-definition";
import { transformControlsEvents } from "@/engine/transform-control-events";

/**
 * Port of the old `scene_initiator.ts`. DI stripped (P3 recipe): GlobalDefinition +
 * TransformControlsEvents become module-singleton imports (the unused MouseObject /
 * InteractionHandler deps are dropped). Bodies unchanged, except for how
 * `initTransformControls` retires the previous controls.
 */
export class SceneInitiator {
  private globalObjectInstance = globalObject;
  private transformControlsEvents = transformControlsEvents;

  async sceneInit() {
    if (this.globalObjectInstance.elementContainer) {
      this.globalObjectInstance.scene = new THREE.Scene();

      //-------------------------------
      // set up controls
      //-------------------------------
      // add transformcontrols to scene
      await this.initTransformControls();

      this.globalObjectInstance.scene.add(this.globalObjectInstance.mousePointer3d);

      await this.initLights();

      this.globalObjectInstance.scene.add(this.globalObjectInstance.plane);

      // add grid
      const helper = new THREE.GridHelper(1000, 1000);
      helper.position.z = this.globalObjectInstance.localZPlane;
      helper.material.opacity = 0.1;
      helper.material.transparent = true;
      // rotate the grid so that it is horizontal
      helper.rotateX(Math.PI / 2);
      this.globalObjectInstance.scene.add(helper);

      const helper2 = new THREE.GridHelper(1000, 100);
      helper2.position.z = this.globalObjectInstance.localZPlane;
      helper2.material.opacity = 0.05;
      helper2.material.transparent = true;
      // rotate the grid so that it is horizontal
      this.globalObjectInstance.scene.add(helper2);
    }
  }

  async initTransformControls() {
    // Retire the previous controls. Since three 0.169 TransformControls is a Controls
    // rather than an Object3D: only its helper sits in a scene (possibly one already
    // swapped out), so searching the scene can never find the controls themselves.
    const previous = this.globalObjectInstance.transformControls;
    if (previous) {
      previous.detach();
      const helper = previous.getHelper();
      helper.removeFromParent();
      // The gizmo builds its geometries and materials per instance, so nothing else holds them.
      helper.traverse((child: THREE.Object3D) => {
        const mesh = child as Partial<THREE.Mesh>;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) mesh.material.forEach((material) => material.dispose());
        else mesh.material?.dispose();
      });
      // `disconnect()` rather than `dispose()`, which calls `this.traverse` in three 0.169
      // and throws. It removes the pointer listeners the constructor put on the canvas.
      previous.disconnect();
    }

    this.globalObjectInstance.transformControls = new TransformControls(this.globalObjectInstance.camera, this.globalObjectInstance.renderer.domElement);

    // this.globalObjectInstance.scene.add(this.globalObjectInstance.transformControls);
    this.globalObjectInstance.scene.add(this.globalObjectInstance.transformControls.getHelper());
    this.globalObjectInstance.transformControls.setMode("scale");

    // remove event listener for onDocumentMouseDown
    // this is important, since thhe transformControls event listener must be registered before the pointerdown event listener
    // thus, we remove it before we initialize the transformControls and add it again after the transformControls are initialized
    this.globalObjectInstance.renderer.domElement.removeEventListener("pointerdown", this.globalObjectInstance.onDocumentMouseDownEventListener);

    // add event listener for transformControls
    this.globalObjectInstance.transformControls.addEventListener("change", () => this.transformControlsEvents.onTransformControlsPropertyChange());
    this.globalObjectInstance.transformControls.addEventListener("mouseUp", async () => await this.transformControlsEvents.onTransformControlsMouseUp());

    // add again event listener for pointerdown
    this.globalObjectInstance.renderer.domElement.addEventListener("pointerdown", this.globalObjectInstance.onDocumentMouseDownEventListener);
  }

  async initLights() {
    // create two directional lights pointing at the point 0,0,0
    const light1 = new THREE.DirectionalLight(0xffffff, 1.3);
    light1.position.set(10, 10, 10);
    this.globalObjectInstance.scene.add(light1);

    const light2 = new THREE.DirectionalLight(0xffffff, 1.3);
    light2.position.set(-10, -10, 0);
    this.globalObjectInstance.scene.add(light2);
  }
}

// Module singleton (replaces the Aurelia @singleton() DI registration).
export const sceneInitiator = new SceneInitiator();
