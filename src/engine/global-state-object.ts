import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { globalObject } from "@/engine/global-definition";
import { globalSelectedObject } from "@/engine/global-selected-object";
import { logger } from "@/resources/services/logger";
import { eventBus } from "@/resources/services/event-bus";

/**
 * Port of the old `resources/global_state_object.ts` (DI-stripping recipe):
 * GlobalDefinition / GlobalSelectedObject / Logger / EventAggregator injections
 * become module-singleton imports (EventAggregator -> eventBus, same
 * `.publish` shape). Bodies unchanged.
 */
export class GlobalStateObject {
  stateNames: string[];
  activeState: string;
  activeStateLine?: Line2;

  private globalObjectInstance = globalObject;
  private globalSelectedObject = globalSelectedObject;
  private logger = logger;
  private eventAggregator = eventBus;

  constructor() {
    this.stateNames = ["SelectionMode (drag)", "ViewMode", "DrawingMode (insert)", "DrawingModeRelationClass (line)", "SimulationMode"];
    this.activeState = "";
  }
  onStateChange() {
    this.logger.log(`The state has changed to ${this.getState()}`, "info");

    // NOTE: the old code published `{ update: true }`; the typed event-bus types
    // `removeAttributeGui` as a void/no-payload channel (plan §6) and the consumer
    // ignores the payload, so it is dropped here.
    this.eventAggregator.publish("removeAttributeGui");

    this.globalSelectedObject.removeObject();
    if (this.globalObjectInstance.transformControls) {
      this.globalObjectInstance.transformControls.detach();
    }
    //if SelectionMode
    if (this.activeState === this.stateNames[0]) {
      this.globalObjectInstance.transformControls.enabled = true;
      this.logger.log("transformControls enabled", "info");

      //if 3d mode, disable orbitcontrols while in selection mode
      if (!this.globalObjectInstance.threeDimensional) {
        this.globalObjectInstance.orbitControls.enabled = true;
        //enable orbitcontrols zoom
        this.globalObjectInstance.orbitControls.enableZoom = true;
        //disable orbitcontrols rotation
        this.globalObjectInstance.orbitControls.enableRotate = false;
        this.logger.log("orbitControls rotation disabled", "info");
      } else {
        this.globalObjectInstance.orbitControls.enabled = true;
        this.logger.log("orbitControls disabled", "info");
        //enable orbitcontrols zoom
        this.globalObjectInstance.orbitControls.enableZoom = true;
        //disable orbitcontrols rotation
        this.globalObjectInstance.orbitControls.enableRotate = false;
      }

      //set cursor style
      this.globalObjectInstance.elementContainer.style.cursor = "grab";
    }
    //if ViewMode
    else if (this.activeState === this.stateNames[1]) {
      this.globalObjectInstance.transformControls.enabled = false;
      this.globalObjectInstance.orbitControls.enabled = true;
      //enable orbitcontrols zoom
      this.globalObjectInstance.orbitControls.enableZoom = true;
      //enable orbitcontrols rotation
      this.globalObjectInstance.orbitControls.enableRotate = true;
      this.logger.log("transformControls disabled", "info");
      this.logger.log("orbitControls enabled", "info");

      //set cursor style
      this.globalObjectInstance.elementContainer.style.cursor = "pointer";
    }
    //if DrawingMode
    else if (this.activeState === this.stateNames[2]) {
      this.globalObjectInstance.transformControls.enabled = false;
      this.globalObjectInstance.orbitControls.enabled = true;
      //enable orbitcontrols zoom
      this.globalObjectInstance.orbitControls.enableZoom = true;
      //enable orbitcontrols rotation
      this.globalObjectInstance.orbitControls.enableRotate = true;
      this.logger.log("transformControls disabled", "info");
      this.logger.log("orbitControls enabled", "info");

      //set cursor style
      this.globalObjectInstance.elementContainer.style.cursor = "copy";
    }
    //if DrawingModeRelationClass
    else if (this.activeState === this.stateNames[3]) {
      this.globalObjectInstance.transformControls.enabled = false;
      this.globalObjectInstance.orbitControls.enabled = true;
      //enable orbitcontrols zoom
      this.globalObjectInstance.orbitControls.enableZoom = true;
      //enable orbitcontrols rotation
      this.globalObjectInstance.orbitControls.enableRotate = true;
      this.logger.log("transformControls disabled", "info");
      //set cursor style
      this.globalObjectInstance.elementContainer.style.cursor = "copy";
    }
    //if SimulationMode
    else if (this.activeState === this.stateNames[4]) {
      this.globalObjectInstance.transformControls.enabled = false;
      this.globalObjectInstance.orbitControls.enabled = true;
      //enable orbitcontrols zoom
      this.globalObjectInstance.orbitControls.enableZoom = true;
      //enable orbitcontrols rotation
      this.globalObjectInstance.orbitControls.enableRotate = true;
      this.logger.log("transformControls disabled", "info");
      this.logger.log("orbitControls enabled", "info");

      //set cursor style
      this.globalObjectInstance.elementContainer.style.cursor = "help";
    }
  }
  getState() {
    return this.activeState;
  }
  setState(value: number) {
    this.activeState = this.stateNames[value];
    this.onStateChange();
  }
  setActiveStateLine(value2: Line2) {
    this.activeStateLine = value2;
  }

  getActiveStateLine() {
    return this.activeStateLine;
  }
}

// Module singleton (replaces the Aurelia @singleton() DI registration).
export const globalStateObject = new GlobalStateObject();
