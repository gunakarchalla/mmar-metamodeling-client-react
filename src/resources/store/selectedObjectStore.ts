import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { SceneType } from "@gds/models/meta/Metamodel_scenetypes.structure";
import { Class } from "@gds/models/meta/Metamodel_classes.structure";
import { Relationclass } from "@gds/models/meta/Metamodel_relationclasses.structure";
import { Port } from "@gds/models/meta/Metamodel_ports.structure";
import { File } from "@gds/models/meta/Metamodel_files.structure";
import { AttributeType } from "@gds/models/meta/Metamodel_attributetypes.structure";
import { Attribute } from "@gds/models/meta/Metamodel_attributes.structure";
import { MetaObject, UUID } from "@gds/models/meta/Metamodel_metaobjects.structure";
import {
  AttributeReference,
  ClassReference,
  PortReference,
  RelationClassReference,
  SceneTypeReference,
} from "@gds/models/meta/Metamodel_references.structure";
import { Role } from "@gds/models/meta/Metamodel_roles.structure";
import { Usergroup } from "@gds/models/meta/Metamodel_usergroups.structure";
import { User } from "@gds/models/meta/Metamodel_users.structure";
import { ColumnStructure } from "@gds/models/meta/Metamodel_columns.structure";
import { Procedure } from "@gds/models/meta/Metamodel_procedure.structure";
import { useLogStore } from "./logStore";

export type SelectableObject =
  | SceneType
  | Class
  | Relationclass
  | Port
  | File
  | AttributeType
  | Attribute
  | User
  | Procedure
  | Usergroup;

/**
 * Clone preserving the prototype (and therefore the class methods), giving a new
 * object identity so React subscribers re-render after an in-place mutation of
 * `selectedObject`. This replaces Aurelia's deep `@bindable` observation.
 */
function reref<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== "object") return obj;
  return Object.assign(Object.create(Object.getPrototypeOf(obj)), obj);
}

const log = (value: string, status: string) => useLogStore.getState().log(value, status);

export interface SelectedObjectState {
  // collections
  sceneTypes: SceneType[];
  classes: Class[];
  relationClasses: Relationclass[];
  ports: Port[];
  attributeTypes: AttributeType[];
  attributes: Attribute[];
  roles: Role[];
  userGroups: Usergroup[];
  users: User[];
  procedures: Procedure[];
  files: File[];

  // selection
  selectedObject: SelectableObject | null | undefined;
  type: string | null | undefined;
  selectedTab: string | undefined;

  // reactivity counter bumped on every in-place mutation of selectedObject
  revision: number;

  // --- core selection API ---
  getSelectedObject: () => SelectableObject | null | undefined;
  getObjectFromUuid: (uuid: UUID) => SelectableObject | Role | null;
  updateLocalObject: (obj: MetaObject) => void;
  setSelectedObject: (objUuid: string) => void;
  deselectObject: () => void;
  resetObjects: () => void;
  getTypeFromUuid: (uuid: UUID) => string | null;
  getObjectsFromRole: (
    role: Role,
  ) => (PortReference | ClassReference | RelationClassReference | SceneTypeReference | AttributeReference)[];

  // --- child add/remove dispatch ---
  removeChild: (uuid: UUID, type?: string) => void;
  addChild: (uuid: UUID, type: string) => void;
  updateMinMax: (uuid: UUID, min: number, max: number) => void;

  // --- remove helpers ---
  selectedObjectRemoveUserGroup: (UserGroupUuid: UUID) => void;
  selectedObjectRemoveReadRight: (uuid: UUID) => void;
  selectedObjectRemoveWriteRight: (uuid: UUID) => void;
  selectedObjectRemoveDeleteRight: (uuid: UUID) => void;
  selectedObjectRemoveCanCreateInstance: (uuid: UUID) => void;
  selectedObjectRemoveReferenceRole: (uuid: UUID) => void;
  selectedObjectRemoveRoleFrom: (uuid: UUID) => void;
  selectedObjectRemoveRoleTo: (uuid: UUID) => void;
  selectedObjectRemoveClass: (uuid: UUID) => void;
  selectedObjectRemoveRelationClass: (uuid: UUID) => void;
  selectedObjectRemovePort: (uuid: UUID) => void;
  selectedObjectRemoveAttribute: (uuid: UUID) => void;
  selectedObjectRemoveProcedure: (uuid: UUID) => void;
  attributeTypeRemoveColumn: (uuid: UUID) => void;

  // --- add helpers ---
  selecedObjectAddUserGroup: (uuid: UUID) => void;
  selectedObjectAddReadRight: (uuid: UUID) => void;
  selectedObjectAddWriteRight: (uuid: UUID) => void;
  selectedObjectAddDeleteRight: (uuid: UUID) => void;
  selectedObjectAddCanCreateInstance: (uuid: UUID) => void;
  selectedObjectAddProcedure: (uuid: UUID) => void;
  attributeTypeAddColumn: (uuid: UUID, sequence: number) => void;
  relationclassAddToRoleFrom: (uuid: UUID) => void;
  relationclassAddToRoleTo: (uuid: UUID) => void;
  selectedObjectAddReferenceRole: (uuid: UUID, min: number, max: number) => void;
  selectedObjectAddClass: (uuid: UUID) => void;
  selectedObjectAddRelationClass: (uuid: UUID) => void;
  selectedObjectAddPort: (uuid: UUID) => void;
  selectedObjectAddAttribute: (uuid: UUID) => void;

  // --- generic collection API ---
  getAllObjects: () => MetaObject[];
  getType: () => string | null | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getObjects: (type: string) => any[] | undefined;
  setObjects: <T>(objects: T[], type: string) => void;
  addObject: <T>(objects: T[] | T, type: string) => void;
  removeObject: (objectUuids: string | string[]) => void;
  getIcon: (wholeVizRep: string) => string;

  // --- per-type accessors ---
  setUsers: (users: User[]) => void;
  getUsers: () => User[];
  addUser: (user: User) => void;
  removeUser: (userUuid: UUID) => void;
  setUserGroups: (userGroups: Usergroup[]) => void;
  getUserGroups: () => Usergroup[];
  addUserGroup: (userGroup: Usergroup) => void;
  removeUserGroup: (userGroupUuid: UUID) => void;
  setRoles: (roles: Role[]) => void;
  getRoles: () => Role[];
  addRole: (role: Role) => void;
  removeRole: (roleUuid: UUID) => void;
  setSceneTypes: (sceneTypes: SceneType[]) => void;
  getSceneTypes: () => SceneType[];
  addSceneType: (sceneType: SceneType) => void;
  removeSceneType: (sceneTypeUuid: UUID) => void;
  setClasses: (classes: Class[]) => void;
  getClasses: () => Class[];
  addClass: (class_: Class) => void;
  removeClass: (classUuid: UUID) => void;
  setRelationClasses: (relationClasses: Relationclass[]) => void;
  getRelationClasses: () => Relationclass[];
  addRelationClass: (relationClass: Relationclass) => void;
  removeRelationClass: (relationClassUuid: UUID) => void;
  setPorts: (ports: Port[]) => void;
  getPorts: () => Port[];
  addPort: (port: Port) => void;
  removePort: (portUuid: UUID) => void;
  setFiles: (files: File[]) => void;
  getFiles: () => File[];
  addFile: (file: File) => void;
  removeFile: (fileUuid: UUID) => void;
  setProcedures: (procedures: Procedure[]) => void;
  getProcedures: () => Procedure[];
  addProcedure: (procedure: Procedure) => void;
  removeProcedure: (procedureUuid: UUID) => void;
  setAttributeTypes: (attributeTypes: AttributeType[]) => void;
  getAttributeTypes: () => AttributeType[];
  addAttributeType: (attributeType: AttributeType) => void;
  removeAttributeType: (attributeTypeUuid: UUID) => void;
  setAttributes: (attributes: Attribute[]) => void;
  getAttributes: () => Attribute[];
  addAttribute: (attribute: Attribute) => void;
  removeAttribute: (attributeUuid: UUID) => void;

  // --- middle-body tab selection ---
  setSelectedTab: (tab: string | undefined) => void;

  // --- General-tab two-way binding: mutate a (possibly nested) field of
  //     selectedObject in place and commit so React subscribers re-render ---
  updateSelectedField: (path: string, value: unknown) => void;
  // re-ref selectedObject after an external in-place mutation of one of its
  // nested arrays (e.g. ParentChildSelect row reordering) so subscribers re-render
  commitSelected: () => void;
}

export const useSelectedObjectStore = create<SelectedObjectState>((set, get) => {
  // commit an in-place mutation of selectedObject so React subscribers re-render
  const commit = () =>
    set((s) => ({ selectedObject: reref(get().selectedObject), revision: s.revision + 1 }));
  // commit a freshly-built selectedObject instance
  const setSelected = (obj: SelectableObject | null) =>
    set((s) => ({ selectedObject: obj, revision: s.revision + 1 }));

  return {
    sceneTypes: [],
    classes: [],
    relationClasses: [],
    ports: [],
    attributeTypes: [],
    attributes: [],
    roles: [],
    userGroups: [],
    users: [],
    procedures: [],
    files: [],

    selectedObject: undefined,
    type: undefined,
    selectedTab: undefined,
    revision: 0,

    getSelectedObject: () => get().selectedObject,

    getObjectFromUuid: (uuid) => {
      if (!uuid) return null;
      const type = get().getTypeFromUuid(uuid);
      if (!type) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((get().getObjects(type) ?? []).find((obj: any) => obj.uuid === uuid) ?? null) as
        | SelectableObject
        | Role
        | null;
    },

    updateLocalObject: (obj) => {
      const type = get().getTypeFromUuid(obj.uuid);
      switch (type) {
        case "SceneType":
          set({
            sceneTypes: get().sceneTypes.map((sceneType) =>
              sceneType.uuid === obj.uuid ? (obj as SceneType) : sceneType,
            ),
          });
          break;
        case "Class":
          set({
            classes: get().classes.map((class_) =>
              class_.uuid === obj.uuid ? (obj as Class) : class_,
            ),
          });
          break;
        case "RelationClass":
          set({
            relationClasses: get().relationClasses.map((relationclass_) =>
              relationclass_.uuid === obj.uuid ? (obj as Relationclass) : relationclass_,
            ),
          });
          break;
        case "Port":
          set({
            ports: get().ports.map((port) => (port.uuid === obj.uuid ? (obj as Port) : port)),
          });
          break;
        case "File":
          set({
            files: get().files.map((file) => (file.uuid === obj.uuid ? (obj as File) : file)),
          });
          break;
        case "AttributeType":
          set({
            attributeTypes: get().attributeTypes.map((attributeType) =>
              attributeType.uuid === obj.uuid ? (obj as AttributeType) : attributeType,
            ),
          });
          break;
        case "Attribute":
          set({
            attributes: get().attributes.map((attribute) =>
              attribute.uuid === obj.uuid ? (obj as Attribute) : attribute,
            ),
          });
          break;
        case "Role":
          set({
            roles: get().roles.map((role) => (role.uuid === obj.uuid ? (obj as Role) : role)),
          });
          break;
        case "Procedure":
          set({
            procedures: get().procedures.map((procedure) =>
              procedure.uuid === obj.uuid ? (obj as Procedure) : procedure,
            ),
          });
          break;
        case "UserGroup":
          set({
            userGroups: get().userGroups.map((usergroup) =>
              usergroup.uuid === obj.uuid ? (obj as Usergroup) : usergroup,
            ),
          });
          break;
        case "User":
          set({
            users: get().users.map((user) => (user.uuid === obj.uuid ? (obj as User) : user)),
          });
          break;
        default:
          console.warn(`Unknown type: ${type}`);
      }
    },

    setSelectedObject: (objUuid) => {
      const type = get().getTypeFromUuid(objUuid);
      let selectedObject: SelectableObject | undefined = undefined;
      switch (type) {
        case "SceneType":
          selectedObject = get().sceneTypes.find((sceneType) => sceneType.uuid === objUuid);
          break;
        case "Class":
          selectedObject = get().classes.find((class_) => class_.uuid === objUuid);
          break;
        case "RelationClass":
          selectedObject = get().relationClasses.find(
            (relationClass) => relationClass.uuid === objUuid,
          );
          break;
        case "Port":
          selectedObject = get().ports.find((port) => port.uuid === objUuid);
          break;
        case "File":
          selectedObject = get().files.find((file) => file.uuid === objUuid);
          break;
        case "Procedure":
          selectedObject = get().procedures.find((procedure) => procedure.uuid === objUuid);
          break;
        case "AttributeType":
          selectedObject = get().attributeTypes.find(
            (attributeType) => attributeType.uuid === objUuid,
          );
          break;
        case "Attribute":
          selectedObject = get().attributes.find((attribute) => attribute.uuid === objUuid);
          break;
        case "User":
          selectedObject = get().users.find((user) => user.uuid === objUuid);
          break;
        case "UserGroup":
          selectedObject = get().userGroups.find((usergroup) => usergroup.uuid === objUuid);
          break;
        default:
          console.warn(`Unknown type: ${type}`);
      }

      set((s) => ({ selectedObject, type, revision: s.revision + 1 }));
      const fullobj = get().getObjectFromUuid(objUuid);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      log(`Selected object: ${(fullobj as any)?.name}`, "info");
    },

    deselectObject: () => {
      set((s) => ({ selectedObject: null, type: null, revision: s.revision + 1 }));
    },

    resetObjects: () => {
      get().setSceneTypes([]);
      get().setClasses([]);
      get().setRelationClasses([]);
      get().setPorts([]);
      get().setFiles([]);
      get().setAttributeTypes([]);
      get().setAttributes([]);
      get().setRoles([]);
      get().setProcedures([]);
      get().setUserGroups([]);
      get().setUsers([]);
      get().deselectObject();
    },

    getTypeFromUuid: (uuid) => {
      const typeMappings = [
        { collection: get().getSceneTypes(), type: "SceneType" },
        { collection: get().getClasses(), type: "Class" },
        { collection: get().getRelationClasses(), type: "RelationClass" },
        { collection: get().getPorts(), type: "Port" },
        { collection: get().getFiles(), type: "File" },
        { collection: get().getAttributeTypes(), type: "AttributeType" },
        { collection: get().getAttributes(), type: "Attribute" },
        { collection: get().getRoles(), type: "Role" },
        { collection: get().getProcedures(), type: "Procedure" },
        { collection: get().getUserGroups(), type: "UserGroup" },
        { collection: get().getUsers(), type: "User" },
      ];
      for (const { collection, type } of typeMappings) {
        if (collection.some((item) => item.uuid === uuid)) {
          return type;
        }
      }
      console.warn(`Unknown type for uuid: ${uuid}`);
      return null;
    },

    getObjectsFromRole: (role) => {
      const toReturn: (
        | PortReference
        | ClassReference
        | RelationClassReference
        | SceneTypeReference
        | AttributeReference
      )[] = [];
      const allReferences = [
        ...role.class_references,
        ...role.relationclass_references,
        ...role.port_references,
        ...role.scenetype_references,
        ...role.attribute_references,
      ];

      for (const reference of allReferences) {
        const obj = get().getObjectFromUuid(reference.uuid) as
          | PortReference
          | ClassReference
          | RelationClassReference
          | SceneTypeReference
          | AttributeReference;
        obj.min = reference.min;
        obj.max = reference.max;
        if (obj) toReturn.push(obj);
      }
      return toReturn;
    },

    removeChild: (uuid, type) => {
      if (!type) {
        type = get().getTypeFromUuid(uuid) ?? undefined;
      }
      switch (type) {
        case "SceneType":
          console.warn("SceneType cannot have children");
          break;
        case "Class":
          get().selectedObjectRemoveClass(uuid);
          break;
        case "RelationClass":
          get().selectedObjectRemoveRelationClass(uuid);
          break;
        case "Port":
          get().selectedObjectRemovePort(uuid);
          break;
        case "AttributeType":
          console.warn("Cannot remove attribute type");
          break;
        case "Attribute":
          get().selectedObjectRemoveAttribute(uuid);
          break;
        case "Source":
          get().selectedObjectRemoveRoleFrom(uuid);
          break;
        case "Destination":
          get().selectedObjectRemoveRoleTo(uuid);
          break;
        case "Role":
          get().selectedObjectRemoveReferenceRole(uuid);
          break;
        case "Column":
          get().attributeTypeRemoveColumn(uuid);
          break;
        case "UserGroup":
          get().selectedObjectRemoveUserGroup(uuid);
          break;
        case "Procedure":
          get().selectedObjectRemoveProcedure(uuid);
          break;
        case "read_right":
          get().selectedObjectRemoveReadRight(uuid);
          break;
        case "write_right":
          get().selectedObjectRemoveWriteRight(uuid);
          break;
        case "delete_right":
          get().selectedObjectRemoveDeleteRight(uuid);
          break;
        case "can_create_instance":
          get().selectedObjectRemoveCanCreateInstance(uuid);
          break;
        default:
          if (get().getTypeFromUuid(uuid)) {
            get().removeChild(uuid, get().getTypeFromUuid(uuid) ?? undefined);
          }
          console.warn(`Unknown type: ${type}`);
      }
    },

    selectedObjectRemoveUserGroup: (UserGroupUuid) => {
      const obj = User.fromJS(get().selectedObject) as User;
      obj.remove_has_user_group_by_uuid(UserGroupUuid);
      setSelected(obj);
    },

    selectedObjectRemoveReadRight: (uuid) => {
      const so = get().selectedObject as Usergroup;
      so.read_right = (so.read_right || []).filter((rightUuid) => rightUuid !== uuid);
      commit();
    },

    selectedObjectRemoveWriteRight: (uuid) => {
      const so = get().selectedObject as Usergroup;
      so.write_right = (so.write_right || []).filter((rightUuid) => rightUuid !== uuid);
      commit();
    },

    selectedObjectRemoveDeleteRight: (uuid) => {
      const so = get().selectedObject as Usergroup;
      so.delete_right = (so.delete_right || []).filter((rightUuid) => rightUuid !== uuid);
      commit();
    },

    selectedObjectRemoveCanCreateInstance: (uuid) => {
      const so = get().selectedObject as Usergroup;
      so.can_create_instance = (so.can_create_instance || []).filter(
        (rightUuid) => rightUuid !== uuid,
      );
      commit();
    },

    selectedObjectRemoveReferenceRole: (uuid) => {
      const type = get().getTypeFromUuid(uuid);
      const referenceTypes: Record<string, string> = {
        Class: "class_references",
        RelationClass: "relationclass_references",
        Port: "port_references",
        SceneType: "scenetype_references",
        Attribute: "attribute_references",
      };

      const referenceKey = type ? referenceTypes[type] : undefined;

      if (referenceKey) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const role = (get().selectedObject as AttributeType).role as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        role[referenceKey] = role[referenceKey].filter((ref: any) => ref.uuid !== uuid);
        commit();
      } else {
        console.warn(`Unknown type: ${type}`);
      }
    },

    selectedObjectRemoveRoleFrom: (uuid) => {
      const so = get().selectedObject as Relationclass;
      switch (get().getTypeFromUuid(uuid)) {
        case "Class":
          so.role_from.class_references = so.role_from.class_references.filter(
            (cr) => cr.uuid !== uuid,
          );
          break;
        case "RelationClass":
          so.role_from.relationclass_references = so.role_from.relationclass_references.filter(
            (rr) => rr.uuid !== uuid,
          );
          break;
        case "Port":
          so.role_from.port_references = so.role_from.port_references.filter(
            (pr) => pr.uuid !== uuid,
          );
          break;
        case "SceneType":
          so.role_from.scenetype_references = so.role_from.scenetype_references.filter(
            (sr) => sr.uuid !== uuid,
          );
          break;
        case "Attribute":
          so.role_from.attribute_references = so.role_from.attribute_references.filter(
            (ar) => ar.uuid !== uuid,
          );
          break;
        default:
          console.warn(`Unknown type: ${get().getTypeFromUuid(uuid)}`);
      }
      commit();
    },

    selectedObjectRemoveRoleTo: (uuid) => {
      const so = get().selectedObject as Relationclass;
      switch (get().getTypeFromUuid(uuid)) {
        case "Class":
          so.role_to.class_references = so.role_to.class_references.filter((cr) => cr.uuid !== uuid);
          break;
        case "RelationClass":
          so.role_to.relationclass_references = so.role_to.relationclass_references.filter(
            (rr) => rr.uuid !== uuid,
          );
          break;
        case "Port":
          so.role_to.port_references = so.role_to.port_references.filter((pr) => pr.uuid !== uuid);
          break;
        case "SceneType":
          so.role_to.scenetype_references = so.role_to.scenetype_references.filter(
            (sr) => sr.uuid !== uuid,
          );
          break;
        case "Attribute":
          so.role_to.attribute_references = so.role_to.attribute_references.filter(
            (ar) => ar.uuid !== uuid,
          );
          break;
        default:
          console.warn(`Unknown type: ${get().getTypeFromUuid(uuid)}`);
      }
      commit();
    },

    updateMinMax: (uuid, min, max) => {
      if (!get().selectedObject) {
        console.warn("No selected object to update");
        return;
      }

      const updateReferenceMinMax = (
        references: (
          | PortReference
          | ClassReference
          | RelationClassReference
          | SceneTypeReference
          | AttributeReference
        )[],
      ) => {
        for (const reference of references) {
          if (reference.uuid === uuid) {
            reference.min = min;
            reference.max = max;
            return true;
          }
        }
        return false;
      };

      const relationClass = get().selectedObject as Relationclass;
      const role = (get().selectedObject as AttributeType).role;

      switch (get().type) {
        case "AttributeType":
        case "Role":
          if (
            updateReferenceMinMax(role.class_references) ||
            updateReferenceMinMax(role.relationclass_references) ||
            updateReferenceMinMax(role.port_references) ||
            updateReferenceMinMax(role.scenetype_references) ||
            updateReferenceMinMax(role.attribute_references)
          ) {
            log(`Updated min/max for role reference ${uuid}, min: ${min}, max: ${max}`, "info");
            commit();
            return;
          }
          break;
        case "RelationClass":
          if (
            updateReferenceMinMax(relationClass.role_from.class_references) ||
            updateReferenceMinMax(relationClass.role_from.relationclass_references) ||
            updateReferenceMinMax(relationClass.role_from.port_references) ||
            updateReferenceMinMax(relationClass.role_from.scenetype_references) ||
            updateReferenceMinMax(relationClass.role_from.attribute_references) ||
            updateReferenceMinMax(relationClass.role_to.class_references) ||
            updateReferenceMinMax(relationClass.role_to.relationclass_references) ||
            updateReferenceMinMax(relationClass.role_to.port_references) ||
            updateReferenceMinMax(relationClass.role_to.scenetype_references) ||
            updateReferenceMinMax(relationClass.role_to.attribute_references)
          ) {
            log(`Updated min/max for relation class reference ${uuid}`, "info");
            commit();
            return;
          }
          break;
        default:
          console.warn(`Unsupported type for updateMinMax: ${get().type}`);
      }

      console.warn(`Reference with uuid ${uuid} not found`);
    },

    selectedObjectRemoveClass: (uuid) => {
      const so = get().selectedObject as SceneType;
      log(`Removed class ${uuid} from selected object ${so.uuid}`, "info");
      so.classes = so.classes.filter((class_) => class_.uuid !== uuid);
      commit();
    },

    selectedObjectRemoveRelationClass: (uuid) => {
      const so = get().selectedObject as SceneType;
      log(`Removed relation class ${uuid} from selected object ${so.uuid}`, "info");
      so.relationclasses = so.relationclasses.filter((relationclass_) => relationclass_.uuid !== uuid);
      commit();
    },

    selectedObjectRemovePort: (uuid) => {
      const so = get().selectedObject as SceneType | Class | Relationclass;
      log(`Removed port ${uuid} from selected object ${so.uuid}`, "info");
      so.ports = so.ports.filter((port) => port.uuid !== uuid);
      commit();
    },

    selectedObjectRemoveAttribute: (uuid) => {
      const so = get().selectedObject as SceneType | Class | Relationclass | Port;
      log(`Removed attribute ${uuid} from selected object ${so.uuid}`, "info");
      so.attributes = so.attributes.filter((attribute) => attribute.uuid !== uuid);
      commit();
    },

    addChild: (uuid, type) => {
      switch (type) {
        case "SceneType":
          console.warn("Cannot add scene type as a child of another object");
          break;
        case "Class":
          get().selectedObjectAddClass(uuid);
          break;
        case "RelationClass":
          get().selectedObjectAddRelationClass(uuid);
          break;
        case "Port":
          get().selectedObjectAddPort(uuid);
          break;
        case "Attribute Type":
          (get().selectedObject as Attribute).attribute_type = get().getObjectFromUuid(
            uuid,
          ) as AttributeType;
          commit();
          break;
        case "Attribute":
          get().selectedObjectAddAttribute(uuid);
          break;
        case "Source":
          get().relationclassAddToRoleFrom(uuid);
          break;
        case "Destination":
          get().relationclassAddToRoleTo(uuid);
          break;
        case "Role":
          get().selectedObjectAddReferenceRole(uuid, 0, 1);
          break;
        case "Column":
          get().attributeTypeAddColumn(uuid, 1);
          break;
        case "Bendpoint":
          (get().selectedObject as Relationclass).bendpoint = uuid;
          commit();
          break;
        case "UserGroup":
          get().selecedObjectAddUserGroup(uuid);
          break;
        case "Procedure":
          get().selectedObjectAddProcedure(uuid);
          break;
        case "read_right":
          get().selectedObjectAddReadRight(uuid);
          break;
        case "write_right":
          get().selectedObjectAddWriteRight(uuid);
          break;
        case "delete_right":
          get().selectedObjectAddDeleteRight(uuid);
          break;
        case "can_create_instance":
          get().selectedObjectAddCanCreateInstance(uuid);
          break;
        default:
          console.warn(`Unknown type: ${type}`);
      }
    },

    selecedObjectAddUserGroup: (uuid) => {
      const obj = User.fromJS(get().selectedObject) as User;
      const usrgrp = get().getObjectFromUuid(uuid) as Usergroup;
      if (!usrgrp) {
        console.warn(`Usergroup with uuid ${uuid} not found`);
        return;
      }
      obj.add_has_user_group(usrgrp);
      setSelected(obj);
    },

    selectedObjectAddReadRight: (uuid) => {
      const so = get().selectedObject as Usergroup;
      if (!so.read_right) {
        so.read_right = [];
      }
      so.read_right.push(uuid);
      commit();
    },

    selectedObjectAddWriteRight: (uuid) => {
      const so = get().selectedObject as Usergroup;
      if (!so.write_right) {
        so.write_right = [];
      }
      so.write_right.push(uuid);
      commit();
    },

    selectedObjectAddDeleteRight: (uuid) => {
      const so = get().selectedObject as Usergroup;
      if (!so.delete_right) {
        so.delete_right = [];
      }
      so.delete_right.push(uuid);
      commit();
    },

    selectedObjectAddCanCreateInstance: (uuid) => {
      const so = get().selectedObject as Usergroup;
      if (!so.can_create_instance) {
        so.can_create_instance = [];
      }
      so.can_create_instance.push(uuid);
      commit();
    },

    selectedObjectAddProcedure: (uuid) => {
      const so = get().selectedObject as SceneType;
      so.procedures.push(get().procedures.find((c) => c.uuid === uuid) as Procedure);
      log(`Added procedure ${uuid} to selected object ${so.uuid}`, "info");
      commit();
    },

    selectedObjectRemoveProcedure: (uuid) => {
      const so = get().selectedObject as SceneType;
      log(`Removed Procedure ${uuid} from selected object ${so.uuid}`, "info");
      so.procedures = so.procedures.filter((procedure_) => procedure_.uuid !== uuid);
      commit();
    },

    attributeTypeAddColumn: (uuid, sequence) => {
      const attribute = get().getObjectFromUuid(uuid) as Attribute;

      if (!attribute) {
        console.warn(`Attribute with uuid ${uuid} not found`);
        return;
      }

      const so = get().selectedObject as AttributeType;
      so.has_table_attribute.push(new ColumnStructure(attribute, sequence));
      commit();
    },

    attributeTypeRemoveColumn: (uuid) => {
      const so = get().selectedObject as AttributeType;
      so.has_table_attribute = so.has_table_attribute.filter(
        (column) => column.attribute.uuid !== uuid,
      );
      commit();
    },

    relationclassAddToRoleFrom: (uuid) => {
      const role = (get().selectedObject as Relationclass).role_from;

      switch (get().getTypeFromUuid(uuid)) {
        case "Class":
          role.class_references.push(new ClassReference(uuid, 0, 1));
          break;
        case "RelationClass":
          role.relationclass_references.push(new RelationClassReference(uuid, 0, 1));
          break;
        case "Port":
          role.port_references.push(new PortReference(uuid, 0, 1));
          break;
        case "SceneType":
          role.scenetype_references.push(new SceneTypeReference(uuid, 0, 1));
          break;
        case "Attribute":
          role.attribute_references.push(new AttributeReference(uuid, 0, 1));
          break;
        default:
          console.warn(`Unknown type: ${get().getTypeFromUuid(uuid)}`);
      }
      commit();
    },

    relationclassAddToRoleTo: (uuid) => {
      const role = (get().selectedObject as Relationclass).role_to;

      switch (get().getTypeFromUuid(uuid)) {
        case "Class":
          role.class_references.push(new ClassReference(uuid, 0, 1));
          break;
        case "RelationClass":
          role.relationclass_references.push(new RelationClassReference(uuid, 0, 1));
          break;
        case "Port":
          role.port_references.push(new PortReference(uuid, 0, 1));
          break;
        case "SceneType":
          role.scenetype_references.push(new SceneTypeReference(uuid, 0, 1));
          break;
        case "Attribute":
          role.attribute_references.push(new AttributeReference(uuid, 0, 1));
          break;
        default:
          console.warn(`Unknown type: ${get().getTypeFromUuid(uuid)}`);
      }
      commit();
    },

    selectedObjectAddReferenceRole: (uuid, min, max) => {
      let role = (get().selectedObject as AttributeType).role;

      if (!role) {
        role = new Role(uuidv4(), `RoleRef_${uuid}`);
        (get().selectedObject as AttributeType).role = role;
      }

      switch (get().getTypeFromUuid(uuid)) {
        case "Class":
          role.class_references.push(new ClassReference(uuid, min, max));
          break;
        case "RelationClass":
          role.relationclass_references.push(new RelationClassReference(uuid, min, max));
          break;
        case "Port":
          role.port_references.push(new PortReference(uuid, min, max));
          break;
        case "SceneType":
          role.scenetype_references.push(new SceneTypeReference(uuid, min, max));
          break;
        case "Attribute":
          role.attribute_references.push(new AttributeReference(uuid, min, max));
          break;
        default:
          console.warn(`Unknown type: ${get().getTypeFromUuid(uuid)}`);
      }
      commit();
    },

    selectedObjectAddClass: (uuid) => {
      const so = get().selectedObject as SceneType;
      so.classes.push(get().classes.find((c) => c.uuid === uuid) as Class);
      log(`Added class ${uuid} to selected object ${so.uuid}`, "info");
      commit();
    },

    selectedObjectAddRelationClass: (uuid) => {
      const so = get().selectedObject as SceneType;
      log(`Added relation class ${uuid} to selected object ${so.uuid}`, "info");
      so.relationclasses.push(get().relationClasses.find((rc) => rc.uuid === uuid) as Relationclass);
      commit();
    },

    selectedObjectAddPort: (uuid) => {
      const so = get().selectedObject as SceneType | Class | Relationclass;
      log(`Added port ${uuid} to selected object ${so.uuid}`, "info");
      so.ports.push(get().ports.find((p) => p.uuid === uuid) as Port);
      commit();
    },

    selectedObjectAddAttribute: (uuid) => {
      const so = get().selectedObject as SceneType | Class | Relationclass | Port;
      log(`Added attribute ${uuid} to selected object ${so.uuid}`, "info");
      so.attributes.push(get().attributes.find((a) => a.uuid === uuid) as Attribute);
      commit();
    },

    getAllObjects: () => {
      const toReturn: MetaObject[] = [];
      toReturn.push(...get().sceneTypes);
      toReturn.push(...get().classes);
      toReturn.push(...get().relationClasses);
      toReturn.push(...get().ports);
      toReturn.push(...get().files);
      toReturn.push(...get().attributeTypes);
      toReturn.push(...get().attributes);
      toReturn.push(...get().procedures);
      return toReturn;
    },

    setUsers: (users) => set({ users }),
    getUsers: () => get().users,
    addUser: (user) => set((s) => ({ users: [...s.users, user] })),
    removeUser: (userUuid) => set((s) => ({ users: s.users.filter((user) => user.uuid !== userUuid) })),

    setUserGroups: (userGroups) => set({ userGroups }),
    getUserGroups: () => get().userGroups,
    addUserGroup: (userGroup) => set((s) => ({ userGroups: [...s.userGroups, userGroup] })),
    removeUserGroup: (userGroupUuid) =>
      set((s) => ({ userGroups: s.userGroups.filter((userGroup) => userGroup.uuid !== userGroupUuid) })),

    setRoles: (roles) => set({ roles }),
    getRoles: () => get().roles,
    addRole: (role) => set((s) => ({ roles: [...s.roles, role] })),
    removeRole: (roleUuid) => set((s) => ({ roles: s.roles.filter((role) => role.uuid !== roleUuid) })),

    setSceneTypes: (sceneTypes) => set({ sceneTypes }),
    getSceneTypes: () => get().sceneTypes,
    addSceneType: (sceneType) => set((s) => ({ sceneTypes: [...s.sceneTypes, sceneType] })),
    removeSceneType: (sceneTypeUuid) =>
      set((s) => ({ sceneTypes: s.sceneTypes.filter((sceneType) => sceneType.uuid !== sceneTypeUuid) })),

    setClasses: (classes) => set({ classes }),
    getClasses: () => get().classes,
    addClass: (class_) => set((s) => ({ classes: [...s.classes, class_] })),
    removeClass: (classUuid) =>
      set((s) => ({ classes: s.classes.filter((class_) => class_.uuid !== classUuid) })),

    setRelationClasses: (relationClasses) => set({ relationClasses }),
    getRelationClasses: () => get().relationClasses,
    addRelationClass: (relationClass) =>
      set((s) => ({ relationClasses: [...s.relationClasses, relationClass] })),
    removeRelationClass: (relationClassUuid) =>
      set((s) => ({
        relationClasses: s.relationClasses.filter(
          (relationClass) => relationClass.uuid !== relationClassUuid,
        ),
      })),

    setPorts: (ports) => set({ ports }),
    getPorts: () => get().ports,
    addPort: (port) => set((s) => ({ ports: [...s.ports, port] })),
    removePort: (portUuid) => set((s) => ({ ports: s.ports.filter((port) => port.uuid !== portUuid) })),

    setFiles: (files) => set({ files }),
    getFiles: () => get().files,
    addFile: (file) => set((s) => ({ files: [...s.files, file] })),
    removeFile: (fileUuid) => set((s) => ({ files: s.files.filter((file) => file.uuid !== fileUuid) })),

    setProcedures: (procedures) => set({ procedures }),
    getProcedures: () => get().procedures,
    addProcedure: (procedure) => set((s) => ({ procedures: [...s.procedures, procedure] })),
    removeProcedure: (procedureUuid) =>
      set((s) => ({ procedures: s.procedures.filter((procedure) => procedure.uuid !== procedureUuid) })),

    setAttributeTypes: (attributeTypes) => set({ attributeTypes }),
    getAttributeTypes: () => get().attributeTypes,
    addAttributeType: (attributeType) =>
      set((s) => ({ attributeTypes: [...s.attributeTypes, attributeType] })),
    removeAttributeType: (attributeTypeUuid) =>
      set((s) => ({
        attributeTypes: s.attributeTypes.filter(
          (attributeType) => attributeType.uuid !== attributeTypeUuid,
        ),
      })),

    setAttributes: (attributes) => set({ attributes }),
    getAttributes: () => get().attributes,
    addAttribute: (attribute) => set((s) => ({ attributes: [...s.attributes, attribute] })),
    removeAttribute: (attributeUuid) =>
      set((s) => ({ attributes: s.attributes.filter((attribute) => attribute.uuid !== attributeUuid) })),

    getType: () => get().type,

    getObjects: (type) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let toReturn: any[] = [];

        switch (type) {
          case "SceneType":
            return get().getSceneTypes();
          case "Class":
            return get().getClasses();
          case "RelationClass":
            return get().getRelationClasses();
          case "Attribute Type":
            return get().getAttributeTypes();
          case "AttributeType":
            return get().getAttributeTypes();
          case "Attribute":
            return get().getAttributes();
          case "Port":
            return get().getPorts();
          case "File":
            return get().getFiles();
          case "Procedure":
            return get().getProcedures();
          case "User":
            return get().getUsers();
          case "UserGroup":
            return get().getUserGroups();
          case "All":
            toReturn = toReturn.concat(get().getSceneTypes());
            toReturn = toReturn.concat(get().getClasses());
            toReturn = toReturn.concat(get().getRelationClasses());
            toReturn = toReturn.concat(get().getAttributeTypes());
            toReturn = toReturn.concat(get().getAttributes());
            toReturn = toReturn.concat(get().getPorts());
            toReturn = toReturn.concat(get().getFiles());
            toReturn = toReturn.concat(get().getProcedures());
            toReturn = toReturn.concat(get().getUsers());
            toReturn = toReturn.concat(get().getUserGroups());
            return toReturn;
          default:
            console.warn(`Unknown type: ${type}`);
        }
      } catch (error) {
        console.error("There was an error getting the objects:", error);
      }
    },

    setObjects: (objects, type) => {
      switch (type) {
        case "SceneType":
          get().setSceneTypes(objects as SceneType[]);
          break;
        case "Class":
          get().setClasses(objects as Class[]);
          break;
        case "RelationClass":
          get().setRelationClasses(objects as Relationclass[]);
          break;
        case "Port":
          get().setPorts(objects as Port[]);
          break;
        case "File":
          get().setFiles(objects as File[]);
          break;
        case "AttributeType":
          get().setAttributeTypes(objects as AttributeType[]);
          break;
        case "Attribute":
          get().setAttributes(objects as Attribute[]);
          break;
        case "UserGroup":
          get().setUserGroups(objects as Usergroup[]);
          break;
        case "User":
          get().setUsers(objects as User[]);
          break;
        case "Procedure":
          get().setProcedures(objects as Procedure[]);
          break;
        default:
          console.warn(`Unknown type: ${type}`);
      }
    },

    addObject: (objects, type) => {
      if (!Array.isArray(objects)) {
        objects = [objects];
      }
      for (const object of objects) {
        switch (type) {
          case "SceneType":
            get().addSceneType(object as SceneType);
            break;
          case "Class":
            get().addClass(object as Class);
            break;
          case "RelationClass":
            get().addRelationClass(object as Relationclass);
            break;
          case "Port":
            get().addPort(object as Port);
            break;
          case "File":
            get().addFile(object as File);
            break;
          case "AttributeType":
            get().addAttributeType(object as AttributeType);
            break;
          case "Attribute":
            get().addAttribute(object as Attribute);
            break;
          case "UserGroup":
            get().addUserGroup(object as Usergroup);
            break;
          case "User":
            get().addUser(object as User);
            break;
          case "Procedure":
            get().addProcedure(object as Procedure);
            break;
          default:
            console.warn(`Unknown type: ${type}`);
        }
      }
    },

    getIcon: (wholeVizRep) => {
      let vizRep: string = wholeVizRep;
      let map = "";
      let next = false;
      const defaultImageBase64 =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAQAAAD9CzEMAAAAdElEQVRYw+2SwQ2AIBAEpwC6oSdqoii6oQD8+DHBAOdpNO7sCx7MbgII8SSBRKGQCP6PRzKVtqeSib69WycOW469ezFvOe/tsGXc27xlrffiFlvvhS3NORJIIMFbBLNIIMGfBKN7Ce4XfPcXzZ4luCYQwsoGpwTEXjWPD4EAAAAASUVORK5CYII=";

      if (!vizRep) {
        // return a default image in base64
        return defaultImageBase64;
      }

      //if icon defined
      vizRep = wholeVizRep.split("let icon")[1];
      if (vizRep) {
        const arrStr: string[] = vizRep.split("'");
        for (const substring of arrStr) {
          const string: string = substring;
          if (string.startsWith("data")) {
            map = string;
            return map;
          } else if (string.endsWith("getImageByUUID(")) {
            next = true;
          } else if (next) {
            const str = defaultImageBase64;
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
            }
          }
        }
      }

      return map;
    },

    removeObject: (objectUuids) => {
      if (!Array.isArray(objectUuids)) {
        objectUuids = [objectUuids];
      }
      for (const objectUuid of objectUuids) {
        const type = get().getTypeFromUuid(objectUuids[0]);
        const object = get().getObjectFromUuid(objectUuid);
        switch (type) {
          case "SceneType":
            get().removeSceneType((object as SceneType).uuid);
            break;
          case "Class":
            get().removeClass((object as Class).uuid);
            break;
          case "RelationClass":
            get().removeRelationClass((object as Relationclass).uuid);
            break;
          case "Port":
            get().removePort((object as Port).uuid);
            break;
          case "File":
            get().removeFile((object as File).uuid);
            break;
          case "AttributeType":
            get().removeAttributeType((object as AttributeType).uuid);
            break;
          case "Attribute":
            get().removeAttribute((object as Attribute).uuid);
            break;
          case "UserGroup":
            get().removeUserGroup((object as Usergroup).uuid);
            break;
          case "User":
            get().removeUser((object as User).uuid);
            break;
          case "Procedure":
            get().removeProcedure((object as Procedure).uuid);
            break;
          default:
            console.warn(`Unknown type: ${type}`);
        }
      }
    },

    setSelectedTab: (tab) => set({ selectedTab: tab }),

    updateSelectedField: (path, value) => {
      const obj = get().selectedObject;
      if (!obj) return;
      const parts = path.split(".");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let target: any = obj;
      for (let i = 0; i < parts.length - 1; i++) {
        if (target[parts[i]] === null || target[parts[i]] === undefined) return;
        target = target[parts[i]];
      }
      target[parts[parts.length - 1]] = value;
      commit();
    },

    commitSelected: () => {
      commit();
    },
  };
});
