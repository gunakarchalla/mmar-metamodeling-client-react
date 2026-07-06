import * as THREE from "three";
import { ObjectInstance } from "@gds";
import { globalObject } from "@/engine/global-definition";
import { globalSelectedObject } from "@/engine/global-selected-object";
import { instanceUtility } from "@/resources/services/instance-utility";

/**
 * Full Phase 5 port of the old `services/transform_control_events.ts`
 * (DI-stripping recipe): GlobalDefinition / GlobalSelectedObject / InstanceUtility
 * injections become module-singleton imports. Bodies unchanged (translate / scale /
 * rotate -> instance custom_variables sync). Strict-TS casts applied:
 * `custom_variables` ({}) string-indexing via `as any`, possibly-undefined
 * `instance`/`parent` non-null-asserted (same runtime behaviour as the untyped
 * original).
 */
export class TransformControlsEvents {
  private globalObjectInstance = globalObject;
  private globalSelectedObject = globalSelectedObject;
  private instanceUtility = instanceUtility;

  onTransformControlsPropertyChange() {
    if (this.globalSelectedObject.object) {
      this.globalSelectedObject.getObject();
      //set scale of y to scale of x -> proportional scale
      this.globalSelectedObject.object.scale.setY(this.globalSelectedObject.object.scale.x);
      this.globalObjectInstance.objectScaled = true;
    }

    this.globalObjectInstance.render = true;
  }

  //this event is triggered, when the button is released in the transformControl mode
  async onTransformControlsMouseUp() {
    const controls = this.globalObjectInstance.transformControls;
    const object: THREE.Mesh = controls.object as THREE.Mesh;
    const mode = controls.mode;

    if (controls && object && mode == "translate") {
      let instance: ObjectInstance | undefined;
      const sceneInstace = (await this.instanceUtility.getTabContextSceneInstance())!;
      const object_Instances: ObjectInstance[] = [...sceneInstace.class_instances, ...(await this.instanceUtility.getAllPortInstancesOfTabContext())];
      instance = object_Instances.find((instance_obj) => instance_obj.uuid == object.uuid);
      if (!instance) {
        instance = object_Instances.find((instance_obj) => instance_obj.uuid == object.parent!.uuid);
      }

      //updates the x_rel, y_rel, z_rel of the instance when label is shifted
      if (object.uuid != instance!.uuid && object.userData.custom_variables) {
        const ocv = object.userData.custom_variables as any;
        const icv = instance!.custom_variables as any;
        ocv[Object.keys(ocv)[0]]["value"] = object.position.x;
        ocv[Object.keys(ocv)[0]]["user_locked"] = true;
        ocv[Object.keys(ocv)[1]]["value"] = object.position.y;
        ocv[Object.keys(ocv)[1]]["user_locked"] = true;
        ocv[Object.keys(ocv)[2]]["value"] = object.position.z;
        ocv[Object.keys(ocv)[2]]["user_locked"] = true;

        //update instance custom_variables on instance as well
        icv[Object.keys(ocv)[0]]["value"] = object.position.x;
        icv[Object.keys(ocv)[0]]["user_locked"] = true;
        icv[Object.keys(ocv)[1]]["value"] = object.position.y;
        icv[Object.keys(ocv)[1]]["user_locked"] = true;
        icv[Object.keys(ocv)[2]]["value"] = object.position.z;
        icv[Object.keys(ocv)[2]]["user_locked"] = true;
        // instance.custom_variables = { ...instance.custom_variables, ...object.userData.custom_variables }
      }
    }

    //if scale mode we set the scale to the instance custom_variables and we check if the children must be rescaled to hold absolue scale
    //if the children have a scale themselfes, they are ignored
    if (mode == "scale") {
      const sceneInstace = (await this.instanceUtility.getTabContextSceneInstance())!;
      const object_Instances: ObjectInstance[] = [...sceneInstace.class_instances, ...(await this.instanceUtility.getAllPortInstancesOfTabContext())];
      object_Instances.find((instance_obj) => instance_obj.uuid == object.uuid);

      if (!object.userData.custom_variables) {
        object.userData.custom_variables = {};
      }

      object.userData.custom_variables.scale = object.scale;
      object.traverse((child: THREE.Object3D) => {
        if (child != object) {
          const newScale: THREE.Vector3 = new THREE.Vector3(1, 1, 1).divide(object.scale);
          if (!child.userData || !("custom_variables" in child.userData) || !("scale" in child.userData.custom_variables)) {
            child.scale.set(newScale.x, newScale.y, newScale.z);
          } else {
            const scale: THREE.Vector3 = child.userData.custom_variables["scale"];
            child.scale.set(scale.x, scale.y, scale.z);
          }
        }
      });
      //update box
      this.globalSelectedObject.getObject();
    }

    if (controls && object && mode == "rotate") {
      let instance: ObjectInstance | undefined;
      const sceneInstace = (await this.instanceUtility.getTabContextSceneInstance())!;
      const object_Instances: ObjectInstance[] = [...sceneInstace.class_instances, ...(await this.instanceUtility.getAllPortInstancesOfTabContext())];
      instance = object_Instances.find((instance_obj) => instance_obj.uuid == object.uuid);
      if (!instance) {
        instance = object_Instances.find((instance_obj) => instance_obj.uuid == object.parent!.uuid);
      }

      //updates the rx, ry, rz and rw of the instance when label is rotated
      if (object.uuid != instance!.uuid && object.userData.custom_variables) {
        const ocv = object.userData.custom_variables as any;
        const icv = instance!.custom_variables as any;
        ocv[Object.keys(ocv)[3]]["value"] = object.quaternion.x;
        ocv[Object.keys(ocv)[3]]["user_locked"] = true;
        ocv[Object.keys(ocv)[4]]["value"] = object.quaternion.y;
        ocv[Object.keys(ocv)[4]]["user_locked"] = true;
        ocv[Object.keys(ocv)[5]]["value"] = object.quaternion.z;
        ocv[Object.keys(ocv)[5]]["user_locked"] = true;
        ocv[Object.keys(ocv)[6]]["value"] = object.quaternion.w;
        ocv[Object.keys(ocv)[6]]["user_locked"] = true;

        //update instance custom_variables on instance as well
        icv[Object.keys(ocv)[3]]["value"] = object.quaternion.x;
        icv[Object.keys(ocv)[3]]["user_locked"] = true;
        icv[Object.keys(ocv)[4]]["value"] = object.quaternion.y;
        icv[Object.keys(ocv)[4]]["user_locked"] = true;
        icv[Object.keys(ocv)[5]]["value"] = object.quaternion.z;
        icv[Object.keys(ocv)[5]]["user_locked"] = true;
        icv[Object.keys(ocv)[6]]["value"] = object.quaternion.w;
        icv[Object.keys(ocv)[6]]["user_locked"] = true;
        // instance.custom_variables = { ...instance.custom_variables, ...object.userData.custom_variables }
      }
    }

    this.globalObjectInstance.render = true;
  }
}

// Module singleton (replaces the Aurelia @singleton() DI registration).
export const transformControlsEvents = new TransformControlsEvents();
