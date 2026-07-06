// IntelliSense documentation for the Monaco editor — the `gc` GraphicContext API
// and its `expression` ExpressionUtility surface. Copied VERBATIM from the old
// `views/code-editor/code-editor.ts` addExtraLib() block. If the documentation
// changes, update it here. Registered once via monaco.languages.typescript.
// javascriptDefaults.addExtraLib (see CodeEditor.tsx).
export const GC_INTELLISENSE = `
/**
 * Expression utility functions for attribute and relation handling.
 */
declare type ExpressionUtility = {
  /** Calls the value of the attribute instance in the local client based on the UUID of the meta attribute. */
  attrval(attrUUID: string): Promise<string>;
  /** Calls the value of the attribute instance in the local client based on the name of the meta attribute. */
  attrvalByName(attrName: string): Promise<string>;
  /** Calls the value of the attribute instance in the local client based on the UUID of any type of instance and the meta attribute UUID. */
  attrvalByInstanceUUID(instUUID: string, attrUUID: string): Promise<string>;
  /** Retrieves the attribute instance in the local client based on the UUID of any type of instance and the meta attribute UUID. */
  getAttrByInstanceUUID(instanceUUID: string, metaAttributeUUID: string): Promise<AttributeInstance>;
  /** Updates the value of the attribute instance in the local client based on the UUID of any type of instance and the meta attribute UUID. */
  setAttrvalByInstanceUUID(instanceUUID: string, metaAttributeUUID: string, value: any): void;
  /** Retrieves all class (and relation class) instances in the local client based on the UUID of the meta class. */
  getClassInstancesByMetaUUID(metaClassUUID: string): Promise<ClassInstance[]>;
  /** Retrieves the source (origin) class instance in the local client based on the UUID of the relation class instance. */
  getSourceByRelInstanceUUID(relInstanceUUID: string): Promise<ClassInstance>;
  /** Retrieves the destination (target) class instance in the local client based on the UUID of the relation class instance. */
  getDestinationByRelInstanceUUID(relInstanceUUID: string): Promise<ClassInstance>;
  /** Retrieves all relation class instances in the local client where the given instance is the destination (target) based on its UUID and optionally filters them by a specific relation type (metaClassUUID). */
  getIncomingRelationsByInstanceUUID(instanceUUID: string, metaClassUUID?: string | null): Promise<RelationclassInstance[]>;
  /** Retrieves all relation class instances in the local client where the given instance is the source (origin) based on its UUID and optionally filters them by a specific relation type (metaClassUUID). */
  getOutgoingRelationsByInstanceUUID(instanceUUID: string, metaClassUUID?: string | null): Promise<RelationclassInstance[]>;
  /** Checks if any type of instance in the local client has both incoming and outgoing relations (i.e. is connected). */
  isConnected(instanceUUID: string): Promise<boolean>;
  /** Checks if there is a visual update. */
  checkForVisualizationUpdate(): void;
  /** Checks if there is a visual update regarding a specific AttributeInstance. */
  checkForVisualizationUpdateByAttributeUUID(instanceUUID: string, metaAttributeUUID: string): void;
  /**
   * Retrieves the file from the local storage or fetches it from the server if not found.
   *
   * @param {string} fileUUID - The UUID of the file.
   * @returns {Promise<string>} - A promise resolving to the file content as a string.
   */
  getFile(fileUUID: string): Promise<string>;
};

/**
 * GraphicContext class for 3D graphics operations.
 */
declare type GraphicContext = {
  /** Set a variable in the context. */
  setVariable(name: string, value: any, instance_adaptable: boolean): Promise<void>;
  /** Get a variable value from the context. */
  getVariableValue(name: string): Promise<any>;
  /** Get a variable's instance adaptability status. */
  getVariableInstance_adaptable(name: string): Promise<any>;
  /** Create a 3D cube object. */
  graphic_cube(width: number, height: number, depth: number, color?: string, map?: string, x_rel?: number, y_rel?: number, z_rel?: number): Promise<any>;
  /** Create a 3D plane object. */
  graphic_plane(width: number, height: number, color?: string, map?: string, x_rel?: number, y_rel?: number, z_rel?: number): Promise<any>;
  /** Create a 3D sphere object. */
  graphic_sphere(radius: number, widthSegments: number, heightSegments: number, color?: string, map?: string, x_rel?: number, y_rel?: number, z_rel?: number): Promise<any>;
  /** Create a 3D cylinder object. */
  graphic_cylinder(radiusTop: number, radiusBottom: number, height: number, radialSegments: number, heightSegments: number, color?: string, map?: string, x_rel?: number, y_rel?: number, z_rel?: number, openEnded?: boolean, thetaStart?: number, thetaLength?: number): Promise<any>;
  /** Load a predefined GLTF object. */
  graphic_gltf(objectString: string, x_rel?: number, y_rel?: number, z_rel?: number): Promise<any>;
  /** Create a 3D button object. */
  graphic_button(object: any, expression?: string): Promise<any>;
  /** Create a 3D text object. */
  graphic_text(x_rel: number, y_rel: number, z_rel: number, size: number, color: string, att: string, pos_name_x?: string, pos_name_y?: string, pos_name_z?: string, rx?: number, ry?: number, rz?: number, rw?: number): Promise<any>;
  /** Create a 3D line for relations. */
  rel_graphic_line(color: string, line_width: number, dashed: boolean, dash_scale: number, dash_size: number, gap_size: number): Promise<void>;
  /** Define the from-object for a relation. */
  rel_from_object(object: any): Promise<void>;
  /** Define the to-object for a relation. */
  rel_to_object(object: any): Promise<void>;
  /** Add text to the from-object of a relation. */
  rel_graphic_text_from(textObject: any): Promise<void>;
  /** Add text to the middle of a relation. */
  rel_graphic_text_middle(textObject: any): Promise<void>;
  /** Add text to the to-object of a relation. */
  rel_graphic_text_to(textObject: any): Promise<void>;
  /** Expression utility functions. */
  expression: ExpressionUtility;
};

declare const gc: GraphicContext;
`;
