import { AttributeInstance, ClassInstance, ObjectInstance, PortInstance, RelationclassInstance, SceneInstance } from "@gds";
import { globalObject } from "@/engine/global-definition";
import { graphicContext } from "@/engine/graphic-context";
import { instanceUtility } from "@/resources/services/instance-utility";
import { metaUtility } from "@/resources/services/meta-utility";
import { eventBus } from "@/resources/services/event-bus";

/**
 * Full Phase 5 port of the old `services/vizrep_update_checker.ts` (DI-stripping
 * recipe): InstanceUtility / MetaUtility / GraphicContext / GlobalDefinition /
 * EventAggregator injections become module-singleton imports (EventAggregator ->
 * eventBus, same `.subscribe` shape). The constructor still wires the
 * `checkForVizRepUpdate` / `checkForVizRepUpdateByAttributeInstance` bus listeners.
 * The `readyForVizRepUpdate` lock/unlock semantics are preserved exactly. Bodies
 * unchanged; strict-TS: meta lookups (`Class|undefined` etc.) non-null-asserted,
 * `custom_variables` ({}) indexed via `as any` (same runtime behaviour as the
 * untyped original).
 */
export class VizrepUpdateChecker {
  private instanceUtility = instanceUtility;
  private metaUtility = metaUtility;
  private gc = graphicContext;
  private globalObjectInstance = globalObject;
  private eventAggregator = eventBus;

  constructor() {
    //event listener for the vizrep update
    //it is not ideal since we loose the synchronization between the event and the function call
    this.eventAggregator.subscribe("checkForVizRepUpdate", async () => {
      await this.checkForVisualizationUpdate();
    });

    //event listener for the vizrep update for specific attribute instances
    this.eventAggregator.subscribe("checkForVizRepUpdateByAttributeInstance", async (payload) => {
      await this.checkForVizRepUpdate(payload as AttributeInstance);
    });
  }

  async checkForVizRepUpdate(attributeInstance: AttributeInstance) {
    //if not set yet lock the vizrep update until the current update is finished
    this.globalObjectInstance.readyForVizRepUpdate = false;

    this.gc.current_instance_object = undefined as any;
    this.gc.resetInstance();

    let objectInstance: ClassInstance | PortInstance | RelationclassInstance | SceneInstance | null = null;
    let geometryAsString = "";
    //retrieve instance where attributeInstance belongs to

    let classInstance: ClassInstance | undefined;
    let relationclassInstances: RelationclassInstance[];
    let relationclassInstance: RelationclassInstance | undefined;

    // check if the attribute instance belongs to a class instance or a relationclass instance
    if (attributeInstance.assigned_uuid_class_instance) {
      relationclassInstances = await this.instanceUtility.getAllRelationClassInstances();

      // find the relationcalss instance where the attribute instance belongs to
      relationclassInstance = relationclassInstances.find((relationclassInstance) => relationclassInstance.uuid == attributeInstance.assigned_uuid_class_instance);

      // if the relationclass instance is not found, the attribute instance belongs to a class instance
      if (!relationclassInstance) {
        classInstance = await this.instanceUtility.getClassInstance(attributeInstance.assigned_uuid_class_instance);
      }

      // set the object instance to the class instance if
      objectInstance = relationclassInstance ? relationclassInstance : classInstance!;
      if (objectInstance) {
        //set the globalObjectInstance.current_class_instance to the object instance
        //this is important for the vizrep update. The vizrep update needs to know the current class instance for relationclass instances and class instances
        this.globalObjectInstance.current_class_instance = objectInstance;
      }

      // get the meta class or relation
      const metaClass = relationclassInstance ? await this.metaUtility.getMetaRelationclass(relationclassInstance.uuid_relationclass) : await this.metaUtility.getMetaClass(classInstance!.uuid_class);
      // set the current instance object to the object instance of the graphic context
      this.gc.current_instance_object = objectInstance;

      // set the geometry string
      const geometry = metaClass!.geometry;
      geometryAsString = geometry.toString();
    }
    //if it was not a class instance or relationclass instance, check if it is a port instance
    else if (attributeInstance.assigned_uuid_port_instance) {
      objectInstance = await this.instanceUtility.getPortInstance(attributeInstance.assigned_uuid_port_instance);
      geometryAsString = (await this.metaUtility.getMetaPort(objectInstance.uuid_port))!.geometry.toString();
    }
    //if it was not a port instance, check if it is a scene instance
    else if (attributeInstance.assigned_uuid_scene_instance) {
      objectInstance = (await this.instanceUtility.getSceneInstance(attributeInstance.assigned_uuid_scene_instance))!;
      geometryAsString = (await this.metaUtility.getSceneTypeByUUID(objectInstance.uuid_scene_type))!.geometry.toString();
    }

    // get the meta attribute name
    const metaAttributeUUID = attributeInstance.uuid_attribute;
    const metaAttributeName = (await this.metaUtility.getMetaAttribute(metaAttributeUUID))!.name;

    // check if the meta attribute is referenced in the geometry attribute
    // we only update the vizrep if the meta attribute is referenced in the geometry attribute
    // If the meta attribute is referenced in the geometry attribute, the geometry attribute has to be updated
    if (geometryAsString.includes(metaAttributeName) || geometryAsString.includes(metaAttributeUUID)) {
      // get all custom_variables
      const customVariables = objectInstance!.custom_variables as any;

      // for each custom_variable (key) in the customVariables object, check if it the value user_locked is true, if not, store it in an array to be updated
      // this is necessary because we only want to update the custom variables that are not user_locked
      // -> e.g., if we shift the position of a text, we don't want to update the position of the text again to the original position
      const customVariablesToUpdate: string[] = [];
      for (const key in customVariables) {
        if (customVariables[key].user_locked === false) {
          customVariablesToUpdate.push(key);
        }
      }

      // remove the custom variable from the object instance if not user_locked
      // the custom_variables will then be updated in the vizrep update
      for (const key of customVariablesToUpdate) {
        delete (objectInstance!.custom_variables as any)[key];
      }

      // run the vizrep function and call the update vizrep function to update the vizrep
      await this.gc.runVizRepFunction(geometryAsString);
      await this.gc.updateVizRep(objectInstance!);
    }

    // unlock the vizrep update
    this.globalObjectInstance.readyForVizRepUpdate = true;
  }

  /**
   * Checks for visualization updates (force redraw).
   */
  async checkForVizRepUpdateForce() {
    //if not set yet lock the vizrep update until the current update is finished
    this.globalObjectInstance.readyForVizRepUpdate = false;

    this.gc.current_instance_object = undefined as any;
    this.gc.resetInstance();

    // get the current scene instance
    const sceneInstance = this.globalObjectInstance.tabContext[this.globalObjectInstance.selectedTab].sceneInstance;
    let geometryAsString = "";

    // check if the sceneInstance contains a class instance
    if (sceneInstance.class_instances.length > 0) {
      // get the class instance
      const classInstance = sceneInstance.class_instances[0];

      // get the meta class
      const metaClass = await this.metaUtility.getMetaClass(classInstance.uuid_class);

      // set the current instance object to the object instance of the graphic context
      this.gc.current_instance_object = classInstance;

      // set the geometry string
      geometryAsString = metaClass!.geometry.toString();
    }

    // check if the sceneInstance contains a relationclass instance
    if (sceneInstance.relationclasses_instances.length > 0) {
      // get the relationclass instance
      const relationclassInstance = sceneInstance.relationclasses_instances[0];

      // get the meta class
      const metaClass = await this.metaUtility.getMetaRelationclass(relationclassInstance.uuid_relationclass);

      // set the current instance object to the object instance of the graphic context
      this.gc.current_instance_object = relationclassInstance;

      // set the geometry string
      geometryAsString = metaClass!.geometry.toString();
    }

    // check if the sceneInstance contains a port instance
    if (sceneInstance.port_instances.length > 0) {
      // get the port instance
      const portInstance = sceneInstance.port_instances[0];

      // get the meta class
      const metaClass = await this.metaUtility.getMetaPort(portInstance.uuid_port);

      // set the current instance object to the object instance of the graphic context
      this.gc.current_instance_object = portInstance;

      // set the geometry string
      geometryAsString = metaClass!.geometry.toString();
    }

    const objectInstance: ObjectInstance = this.gc.current_instance_object;
    // get all custom_variables
    const customVariables = this.gc.current_instance_object.custom_variables as any;

    // for each custom_variable (key) in the customVariables object, check if it the value user_locked is true, if not, store it in an array to be updated
    // this is necessary because we only want to update the custom variables that are not user_locked
    // -> e.g., if we shift the position of a text, we don't want to update the position of the text again to the original position
    const customVariablesToUpdate: string[] = [];
    for (const key in customVariables) {
      if (customVariables[key].user_locked === false) {
        customVariablesToUpdate.push(key);
      }
    }

    // remove the custom variable from the object instance if not user_locked
    // the custom_variables will then be updated in the vizrep update
    for (const key of customVariablesToUpdate) {
      delete (objectInstance.custom_variables as any)[key];
    }

    // run the vizrep function and call the update vizrep function to update the vizrep
    await this.gc.runVizRepFunction(geometryAsString);
    await this.gc.updateVizRep(objectInstance);

    // unlock the vizrep update
    this.globalObjectInstance.readyForVizRepUpdate = true;
  }

  /**
   * Checks for visualization updates.
   */
  async checkForVisualizationUpdate() {
    //get all attributeInstances that are assigned to the current sceneInstance, its classInstances, relationclassInstances and portInstances
    const sceneInstance = this.globalObjectInstance.tabContext[this.globalObjectInstance.selectedTab].sceneInstance;
    let attributeInstances: AttributeInstance[] = sceneInstance.attribute_instances;

    attributeInstances = [...attributeInstances, ...(await this.instanceUtility.getAllAttributeInstancesFromObjectInstanceRecursively(sceneInstance))];

    // Create a Set to track processed class instance UUIDs
    const processedClassInstanceUUIDs = new Set<string>();

    //for each attribute run the checkForVizRepUpdate function
    for (const attributeInstance of attributeInstances) {
      if (attributeInstance.assigned_uuid_class_instance && !processedClassInstanceUUIDs.has(attributeInstance.assigned_uuid_class_instance)) {
        await this.checkForVizRepUpdate(attributeInstance);
        processedClassInstanceUUIDs.add(attributeInstance.assigned_uuid_class_instance);
      }
    }
  }
}

// Module singleton (replaces the Aurelia @singleton() DI registration).
export const vizrepUpdateChecker = new VizrepUpdateChecker();
