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
import {
  META_TYPES,
  META_TYPE_NAMES,
  MetaCollectionKey,
  MetaTypeName,
  collectionKeyOf,
} from "@/resources/meta-model/meta-types";
import { deepClone, reref } from "@/resources/util/clone";
import { TabHistory, newHistory, pushHistory } from "./tab-history";
import { useLogStore } from "./logStore";
import { useEditorStore } from "./editorStore";
import { eventBus } from "../services/event-bus";

/**
 * The metamodel the user is editing, plus which part of it is on screen.
 *
 * The app has no router: what you see is decided by this store's `selectedObject`
 * and by the strip of open tabs above the editor. Each tab owns its own working
 * copy of an object, so unsaved edits survive switching between tabs and are
 * only reconciled with the loaded collections when the tab is saved.
 */

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

/** Any of the five reference lists a role can hold. */
type AnyReference =
  | ClassReference
  | RelationClassReference
  | PortReference
  | SceneTypeReference
  | AttributeReference;

const log = (value: string, status: string) => useLogStore.getState().log(value, status);

// ---------------------------------------------------------------------------
// Role references
// ---------------------------------------------------------------------------

/**
 * A role points at other meta objects through one list per target type. Naming
 * each list once here keeps the add / remove / iterate paths below from
 * repeating the same five-way `switch`.
 */
const REFERENCE_KINDS = [
  { type: "Class", field: "class_references", Ref: ClassReference },
  { type: "RelationClass", field: "relationclass_references", Ref: RelationClassReference },
  { type: "Port", field: "port_references", Ref: PortReference },
  { type: "SceneType", field: "scenetype_references", Ref: SceneTypeReference },
  { type: "Attribute", field: "attribute_references", Ref: AttributeReference },
] as const;

type ReferenceListHolder = Record<string, AnyReference[]>;

const referenceKindFor = (type: string | null) =>
  REFERENCE_KINDS.find((kind) => kind.type === type);

/** Every reference a role holds, regardless of target type. */
function allReferences(role: Role): AnyReference[] {
  const lists = role as unknown as ReferenceListHolder;
  return REFERENCE_KINDS.flatMap((kind) => lists[kind.field] ?? []);
}

/** True when a role points at nothing at all. */
function roleIsEmpty(role: Role): boolean {
  return allReferences(role).length === 0;
}

function addReference(role: Role, uuid: UUID, type: string | null, min: number, max: number) {
  const kind = referenceKindFor(type);
  if (!kind) {
    console.warn(`Unknown type: ${type}`);
    return;
  }
  (role as unknown as ReferenceListHolder)[kind.field].push(new kind.Ref(uuid, min, max));
}

function removeReference(role: Role, uuid: UUID, type: string | null) {
  const kind = referenceKindFor(type);
  if (!kind) {
    console.warn(`Unknown type: ${type}`);
    return;
  }
  const lists = role as unknown as ReferenceListHolder;
  lists[kind.field] = lists[kind.field].filter((reference) => reference.uuid !== uuid);
}

/** Set min/max on whichever of `role`'s references has `uuid`. Reports success. */
function setReferenceBounds(role: Role, uuid: UUID, min: number, max: number): boolean {
  const reference = allReferences(role).find((candidate) => candidate.uuid === uuid);
  if (!reference) return false;
  reference.min = min;
  reference.max = max;
  return true;
}

// ---------------------------------------------------------------------------
// Editor tabs
// ---------------------------------------------------------------------------

/**
 * One open editor tab. Its `object` is a working copy decoupled from the loaded
 * collection, so edits made here are not visible in the left navigation until
 * the tab is saved and the server's response replaces the collection entry.
 */
export interface OpenTab {
  uuid: UUID;
  type: string;
  object: SelectableObject;
  /** The sub-tab ("General", "Attributes", …) this tab was last left on. */
  innerTab: string | undefined;
  /** True while the working copy holds edits that were never persisted. */
  dirty: boolean;
  /** Undo/redo stack, scoped to this tab. */
  history: TabHistory<SelectableObject>;
}

const activeHistory = (s: SelectedObjectState) =>
  s.openTabs.find((t) => t.uuid === s.activeTabUuid)?.history;

/**
 * Selectors for the undo/redo controls. They yield booleans, so a subscribing
 * component re-renders only when availability actually flips — not on every
 * keystroke that pushes a snapshot.
 */
export const selectCanUndo = (s: SelectedObjectState) => {
  const history = activeHistory(s);
  return !!history && history.index > 0;
};

export const selectCanRedo = (s: SelectedObjectState) => {
  const history = activeHistory(s);
  return !!history && history.index < history.entries.length - 1;
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export interface SelectedObjectState {
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

  /** Always a mirror of the active entry in `openTabs`. */
  selectedObject: SelectableObject | null | undefined;
  type: string | null | undefined;
  selectedTab: string | undefined;

  /** Open editor tabs, in the order they were opened. */
  openTabs: OpenTab[];
  activeTabUuid: UUID | null;

  /** Bumped on every in-place mutation of `selectedObject`, to drive re-renders. */
  revision: number;

  // --- selection ---
  getSelectedObject: () => SelectableObject | null | undefined;
  getType: () => string | null | undefined;
  setSelectedObject: (objUuid: UUID) => void;
  deselectObject: () => void;
  /** Mutate a (possibly nested) field of the selected object and commit. */
  updateSelectedField: (path: string, value: unknown) => void;
  /** Re-publish the selected object after an external in-place mutation. */
  commitSelected: () => void;
  setSelectedTab: (tab: string | undefined) => void;

  // --- open tabs ---
  activateTab: (uuid: UUID) => void;
  closeTab: (uuid: UUID) => void;
  closeAllTabs: () => void;
  markTabClean: (uuid: UUID) => void;
  getTab: (uuid: UUID) => OpenTab | undefined;
  hasUnsavedTabs: () => boolean;

  // --- undo/redo, scoped to the active tab ---
  undo: () => void;
  redo: () => void;

  // --- collections ---
  getObjects: (type: string) => MetaObject[] | undefined;
  setObjects: <T>(objects: T[], type: string) => void;
  addObject: <T>(objects: T[] | T, type: string) => void;
  removeObject: (objectUuids: UUID | UUID[]) => void;
  updateLocalObject: (obj: MetaObject) => void;
  resetObjects: () => void;
  getObjectFromUuid: (uuid: UUID) => SelectableObject | Role | null;
  getTypeFromUuid: (uuid: UUID) => MetaTypeName | null;
  /** Expand a role into the meta objects it references, carrying min/max. */
  getObjectsFromRole: (role: Role) => AnyReference[];

  // --- children of the selected object ---
  addChild: (uuid: UUID, type: string) => void;
  removeChild: (uuid: UUID, type?: string) => void;
  updateMinMax: (uuid: UUID, min: number, max: number) => void;
}

/**
 * The "nothing loaded" state of every collection. Spelled out rather than
 * derived so the object is typed per collection; `satisfies` still fails the
 * build if it ever drifts from the type registry.
 */
const emptyCollections = () =>
  ({
    sceneTypes: [],
    classes: [],
    relationClasses: [],
    ports: [],
    files: [],
    attributeTypes: [],
    attributes: [],
    roles: [],
    procedures: [],
    userGroups: [],
    users: [],
  }) satisfies Record<MetaCollectionKey, never[]>;

/** Read a collection generically, without narrowing to its element type. */
const collectionOf = (s: SelectedObjectState, key: MetaCollectionKey): MetaObject[] =>
  s[key] as MetaObject[];

/** A `set` payload replacing one collection, typed for zustand's partial update. */
const collectionUpdate = (key: MetaCollectionKey, objects: MetaObject[]) =>
  ({ [key]: objects }) as unknown as Partial<SelectedObjectState>;

export const useSelectedObjectStore = create<SelectedObjectState>((set, get) => {
  // -------------------------------------------------------------------------
  // Committing an edit
  // -------------------------------------------------------------------------

  /**
   * Push the new working copy back into the active tab, record an undo snapshot
   * and re-derive the dirty flag.
   *
   * Every edit — bound form field, structural add/remove, min/max, row
   * reordering, geometry — funnels through here, which is what makes undo and
   * the unsaved-changes marker cover all of them without per-mutator bookkeeping
   * that could drift out of step.
   */
  const syncActiveTab = (
    s: SelectedObjectState,
    obj: SelectableObject | null | undefined,
    coalesceKey?: string,
  ) =>
    s.openTabs.map((t) => {
      if (t.uuid !== s.activeTabUuid || !obj) return t;
      const history = pushHistory(t.history, deepClone(obj), coalesceKey);
      return { ...t, object: obj, history, dirty: history.index !== history.savedIndex };
    });

  /** Commit an in-place mutation of `selectedObject`. */
  const commit = (coalesceKey?: string) =>
    set((s) => {
      const next = reref(s.selectedObject);
      return {
        selectedObject: next,
        openTabs: syncActiveTab(s, next, coalesceKey),
        revision: s.revision + 1,
      };
    });

  /** Commit a freshly-built replacement for `selectedObject`. */
  const setSelected = (obj: SelectableObject | null) =>
    set((s) => ({
      selectedObject: obj,
      openTabs: syncActiveTab(s, obj),
      revision: s.revision + 1,
    }));

  /** The selected object, narrowed to whichever shape the caller expects. */
  const selected = <T>() => get().selectedObject as T;

  // -------------------------------------------------------------------------
  // Undo / redo
  // -------------------------------------------------------------------------

  /**
   * `geometry` is mirrored outside the object in two places: the code editor's
   * buffer and the 3D canvas. A history step that changes it has to refresh both
   * — but only then, since re-pushing an unchanged geometry would replace the
   * editor's beautified buffer with the object's raw source and redraw the
   * canvas for nothing.
   */
  const syncGeometryMirrors = (before: SelectableObject, after: SelectableObject) => {
    const afterGeometry = after?.geometry?.toString() ?? "";
    if ((before?.geometry?.toString() ?? "") === afterGeometry) return;
    useEditorStore.getState().setCode(afterGeometry);
    eventBus.publish("previewSelectedObject");
  };

  /**
   * Move the active tab one step through its history: -1 undoes, +1 redoes.
   * Out-of-range steps are a no-op, so buttons and shortcuts need no guard.
   */
  const travel = (delta: 1 | -1) => {
    const state = get();
    const tab = state.openTabs.find((t) => t.uuid === state.activeTabUuid);
    if (!tab) return;

    const nextIndex = tab.history.index + delta;
    if (nextIndex < 0 || nextIndex >= tab.history.entries.length) return;

    const before = tab.history.entries[tab.history.index];
    // Clone on the way out too: the restored copy is what the next in-place
    // mutation edits, and that must not reach back into the stored snapshot.
    const restored = deepClone(tab.history.entries[nextIndex]);
    // Reset the coalescing window so the first edit after a step always starts a
    // new entry rather than merging into the one we just landed on.
    const history: TabHistory<SelectableObject> = {
      ...tab.history,
      index: nextIndex,
      coalesceKey: null,
      coalesceAt: 0,
    };

    set((s) => ({
      selectedObject: restored,
      openTabs: s.openTabs.map((t) =>
        t.uuid === tab.uuid
          ? { ...t, object: restored, history, dirty: nextIndex !== history.savedIndex }
          : t,
      ),
      revision: s.revision + 1,
    }));

    syncGeometryMirrors(before, restored);
    log(`${delta < 0 ? "Undo" : "Redo"}: ${restored?.name}`, "info");
  };

  // -------------------------------------------------------------------------
  // Mutators for the children of the selected object
  // -------------------------------------------------------------------------

  /** Collections whose members can be attached to the selected object as-is. */
  type ChildField = "classes" | "relationclasses" | "ports" | "attributes" | "procedures";
  type ChildContainer = Record<ChildField, MetaObject[]> & { uuid: UUID };

  const addLoadedChild = (uuid: UUID, type: MetaTypeName, field: ChildField) => {
    const child = (get().getObjects(type) ?? []).find((o) => o.uuid === uuid);
    if (!child) {
      console.warn(`${type} with uuid ${uuid} not found`);
      return;
    }
    const parent = selected<ChildContainer>();
    parent[field].push(child);
    log(`Added ${type} ${uuid} to selected object ${parent.uuid}`, "info");
    commit();
  };

  const removeLoadedChild = (uuid: UUID, field: ChildField) => {
    const parent = selected<ChildContainer>();
    parent[field] = parent[field].filter((child) => child.uuid !== uuid);
    log(`Removed ${uuid} from selected object ${parent.uuid}`, "info");
    commit();
  };

  /** User-group rights are plain uuid arrays that may not exist yet. */
  type RightField = "read_right" | "write_right" | "delete_right" | "can_create_instance";

  const addRight = (uuid: UUID, field: RightField) => {
    const group = selected<Usergroup>();
    group[field] = [...(group[field] ?? []), uuid];
    commit();
  };

  const removeRight = (uuid: UUID, field: RightField) => {
    const group = selected<Usergroup>();
    group[field] = (group[field] ?? []).filter((rightUuid) => rightUuid !== uuid);
    commit();
  };

  const addUserGroupMembership = (uuid: UUID) => {
    const group = get().getObjectFromUuid(uuid) as Usergroup | null;
    if (!group) {
      console.warn(`Usergroup with uuid ${uuid} not found`);
      return;
    }
    // `add_has_user_group` is a method of the User data structure, and the store
    // holds the raw JSON the server sent, so revive it before calling in.
    const user = User.fromJS(get().selectedObject) as User;
    user.add_has_user_group(group);
    setSelected(user);
  };

  const removeUserGroupMembership = (uuid: UUID) => {
    const user = User.fromJS(get().selectedObject) as User;
    user.remove_has_user_group_by_uuid(uuid);
    setSelected(user);
  };

  const addColumn = (uuid: UUID, sequence: number) => {
    const attribute = get().getObjectFromUuid(uuid) as Attribute | null;
    if (!attribute) {
      console.warn(`Attribute with uuid ${uuid} not found`);
      return;
    }
    selected<AttributeType>().has_table_attribute.push(new ColumnStructure(attribute, sequence));
    commit();
  };

  const removeColumn = (uuid: UUID) => {
    const attributeType = selected<AttributeType>();
    attributeType.has_table_attribute = attributeType.has_table_attribute.filter(
      (column) => column.attribute.uuid !== uuid,
    );
    commit();
  };

  /** Attach a reference to one of a relation class's two ends. */
  const addRelationEnd = (uuid: UUID, end: "role_from" | "role_to") => {
    addReference(selected<Relationclass>()[end], uuid, get().getTypeFromUuid(uuid), 0, 1);
    commit();
  };

  const removeRelationEnd = (uuid: UUID, end: "role_from" | "role_to") => {
    removeReference(selected<Relationclass>()[end], uuid, get().getTypeFromUuid(uuid));
    commit();
  };

  /**
   * Attribute types reference other objects through a single, lazily created
   * role. Creating it on the first reference (and dropping it again with the
   * last) is what tells the server whether the attribute type has a role at all:
   * a hard update with no role deletes it, whereas an empty one would linger.
   */
  const addAttributeTypeReference = (uuid: UUID, min: number, max: number) => {
    const attributeType = selected<AttributeType>();
    if (!attributeType.role) {
      attributeType.role = new Role(uuidv4(), `RoleRef_${uuid}`);
    }
    addReference(attributeType.role, uuid, get().getTypeFromUuid(uuid), min, max);
    commit();
  };

  const removeAttributeTypeReference = (uuid: UUID) => {
    const attributeType = selected<AttributeType>();
    const type = get().getTypeFromUuid(uuid);
    if (!attributeType.role || !referenceKindFor(type)) {
      console.warn(`Unknown type: ${type}`);
      return;
    }
    removeReference(attributeType.role, uuid, type);
    if (roleIsEmpty(attributeType.role)) {
      attributeType.role = undefined as unknown as Role;
    }
    commit();
  };

  /**
   * How each kind of child is attached to, and detached from, the selected
   * object.
   *
   * Keys are the `objecttypetoadd` values the structural tabs pass. Most name a
   * meta type; the rest are pseudo-types standing for a specific slot of the
   * parent ("Source"/"Destination" for a relation's two ends, "Column" for a
   * table row, the four user-group rights, "Bendpoint" for a relation's bend).
   */
  const CHILD_HANDLERS: Record<
    string,
    { add?: (uuid: UUID) => void; remove?: (uuid: UUID) => void }
  > = {
    Class: {
      add: (uuid) => addLoadedChild(uuid, "Class", "classes"),
      remove: (uuid) => removeLoadedChild(uuid, "classes"),
    },
    RelationClass: {
      add: (uuid) => addLoadedChild(uuid, "RelationClass", "relationclasses"),
      remove: (uuid) => removeLoadedChild(uuid, "relationclasses"),
    },
    Port: {
      add: (uuid) => addLoadedChild(uuid, "Port", "ports"),
      remove: (uuid) => removeLoadedChild(uuid, "ports"),
    },
    Attribute: {
      add: (uuid) => addLoadedChild(uuid, "Attribute", "attributes"),
      remove: (uuid) => removeLoadedChild(uuid, "attributes"),
    },
    Procedure: {
      add: (uuid) => addLoadedChild(uuid, "Procedure", "procedures"),
      remove: (uuid) => removeLoadedChild(uuid, "procedures"),
    },
    "Attribute Type": {
      add: (uuid) => {
        selected<Attribute>().attribute_type = get().getObjectFromUuid(uuid) as AttributeType;
        commit();
      },
    },
    Bendpoint: {
      add: (uuid) => {
        selected<Relationclass>().bendpoint = uuid;
        commit();
      },
    },
    Source: {
      add: (uuid) => addRelationEnd(uuid, "role_from"),
      remove: (uuid) => removeRelationEnd(uuid, "role_from"),
    },
    Destination: {
      add: (uuid) => addRelationEnd(uuid, "role_to"),
      remove: (uuid) => removeRelationEnd(uuid, "role_to"),
    },
    Role: {
      add: (uuid) => addAttributeTypeReference(uuid, 0, 1),
      remove: removeAttributeTypeReference,
    },
    Column: {
      add: (uuid) => addColumn(uuid, 1),
      remove: removeColumn,
    },
    UserGroup: {
      add: addUserGroupMembership,
      remove: removeUserGroupMembership,
    },
    read_right: {
      add: (uuid) => addRight(uuid, "read_right"),
      remove: (uuid) => removeRight(uuid, "read_right"),
    },
    write_right: {
      add: (uuid) => addRight(uuid, "write_right"),
      remove: (uuid) => removeRight(uuid, "write_right"),
    },
    delete_right: {
      add: (uuid) => addRight(uuid, "delete_right"),
      remove: (uuid) => removeRight(uuid, "delete_right"),
    },
    can_create_instance: {
      add: (uuid) => addRight(uuid, "can_create_instance"),
      remove: (uuid) => removeRight(uuid, "can_create_instance"),
    },
  };

  return {
    ...emptyCollections(),

    selectedObject: undefined,
    type: undefined,
    selectedTab: undefined,
    openTabs: [],
    activeTabUuid: null,
    revision: 0,

    // ----- selection -------------------------------------------------------

    getSelectedObject: () => get().selectedObject,

    getType: () => get().type,

    setSelectedObject: (objUuid) => {
      // Already open: focus that tab. Re-reading the collection here would throw
      // away the tab's unsaved working copy.
      if (get().openTabs.some((t) => t.uuid === objUuid)) {
        get().activateTab(objUuid);
        return;
      }

      const type = get().getTypeFromUuid(objUuid);
      const stored = type
        ? (get().getObjects(type) ?? []).find((o) => o.uuid === objUuid)
        : undefined;

      if (!stored || !type) {
        console.warn(`No object found for uuid: ${objUuid}`);
        return;
      }

      // Edit a copy, so an in-progress rename is not echoed in the left
      // navigation until the save response replaces the collection entry.
      const workingCopy = reref(stored) as SelectableObject;
      set((s) => ({
        selectedObject: workingCopy,
        type,
        // A freshly opened tab always starts on the General sub-tab.
        selectedTab: "General",
        openTabs: [
          ...s.openTabs,
          {
            uuid: objUuid,
            type,
            object: workingCopy,
            innerTab: "General",
            dirty: false,
            // The as-opened state is the tab's undo floor.
            history: newHistory<SelectableObject>(workingCopy),
          },
        ],
        activeTabUuid: objUuid,
        revision: s.revision + 1,
      }));
      log(`Selected object: ${stored.name}`, "info");
    },

    /** Clears the selection *and* every open tab. */
    deselectObject: () => get().closeAllTabs(),

    updateSelectedField: (path, value) => {
      const obj = get().selectedObject;
      if (!obj) return;

      const parts = path.split(".");
      let target = obj as unknown as Record<string, unknown>;
      for (const part of parts.slice(0, -1)) {
        // Create missing intermediate objects so a nested field can be set even
        // when its parent is absent: the coordinate objects (coordinates_2d,
        // relative_coordinate_3d, absolute_coordinate_3d) are left undefined
        // unless the server sent a value, so without this the X/Y/Z inputs bound
        // to e.g. "coordinates_2d.x" could never be edited.
        if (target[part] === null || target[part] === undefined) {
          target[part] = {};
        }
        target = target[part] as Record<string, unknown>;
      }
      target[parts[parts.length - 1]] = value;

      // The path doubles as the coalescing key: this is the keystroke-rate
      // mutator, so a run of edits to one field collapses into one undo step.
      commit(path);
    },

    commitSelected: () => commit(),

    /** Remembered per tab, so returning to a tab lands on the sub-tab you left. */
    setSelectedTab: (tab) =>
      set((s) => ({
        selectedTab: tab,
        openTabs: s.openTabs.map((t) =>
          t.uuid === s.activeTabUuid ? { ...t, innerTab: tab } : t,
        ),
      })),

    // ----- open tabs -------------------------------------------------------

    /** Focus an already-open tab, restoring its working copy and its sub-tab. */
    activateTab: (uuid) => {
      const tab = get().openTabs.find((t) => t.uuid === uuid);
      if (!tab) return;
      set((s) => ({
        selectedObject: tab.object,
        type: tab.type,
        selectedTab: tab.innerTab,
        activeTabUuid: tab.uuid,
        revision: s.revision + 1,
      }));
    },

    /**
     * Close a tab unconditionally. Prompting about unsaved changes lives in the
     * tab strip — by the time this runs the decision has been made.
     */
    closeTab: (uuid) => {
      const tabs = get().openTabs;
      const index = tabs.findIndex((t) => t.uuid === uuid);
      if (index === -1) return;

      const remaining = tabs.filter((t) => t.uuid !== uuid);
      set({ openTabs: remaining });
      if (get().activeTabUuid !== uuid) return;

      // Focus the neighbour that slid into this slot, else the one before it.
      const next = remaining[index] ?? remaining[index - 1];
      if (next) {
        get().activateTab(next.uuid);
        return;
      }
      set((s) => ({
        selectedObject: null,
        type: null,
        selectedTab: undefined,
        activeTabUuid: null,
        revision: s.revision + 1,
      }));
    },

    closeAllTabs: () =>
      set((s) => ({
        openTabs: [],
        activeTabUuid: null,
        selectedObject: null,
        type: null,
        selectedTab: undefined,
        revision: s.revision + 1,
      })),

    /**
     * The tab's current history entry is now what the server holds, so undoing
     * back to it (or redoing forward to it) makes the tab clean again.
     */
    markTabClean: (uuid) =>
      set((s) => ({
        openTabs: s.openTabs.map((t) =>
          t.uuid === uuid
            ? { ...t, dirty: false, history: { ...t.history, savedIndex: t.history.index } }
            : t,
        ),
      })),

    getTab: (uuid) => get().openTabs.find((t) => t.uuid === uuid),

    hasUnsavedTabs: () => get().openTabs.some((t) => t.dirty),

    undo: () => travel(-1),
    redo: () => travel(1),

    // ----- collections -----------------------------------------------------

    /**
     * Every loaded object of `type`, or of every listed type for `"All"`.
     * Returns `undefined` (after a warning) for anything that names no type.
     */
    getObjects: (type) => {
      if (type === "All") {
        return META_TYPE_NAMES.filter((name) => META_TYPES[name].listed).flatMap((name) =>
          collectionOf(get(), META_TYPES[name].collection),
        );
      }
      const collection = collectionKeyOf(type);
      if (!collection) {
        console.warn(`Unknown type: ${type}`);
        return undefined;
      }
      return collectionOf(get(), collection);
    },

    setObjects: (objects, type) => {
      const collection = collectionKeyOf(type);
      if (!collection) {
        console.warn(`Unknown type: ${type}`);
        return;
      }
      set(collectionUpdate(collection, objects as unknown as MetaObject[]));
    },

    addObject: (objects, type) => {
      const collection = collectionKeyOf(type);
      if (!collection) {
        console.warn(`Unknown type: ${type}`);
        return;
      }
      const added = (Array.isArray(objects) ? objects : [objects]) as unknown as MetaObject[];
      set((s) => collectionUpdate(collection, [...collectionOf(s, collection), ...added]));
    },

    removeObject: (objectUuids) => {
      for (const uuid of Array.isArray(objectUuids) ? objectUuids : [objectUuids]) {
        const collection = collectionKeyOf(get().getTypeFromUuid(uuid));
        if (!collection) continue;
        set((s) =>
          collectionUpdate(
            collection,
            collectionOf(s, collection).filter((o) => o.uuid !== uuid),
          ),
        );
        // A deleted object cannot stay open — drop its tab without prompting.
        get().closeTab(uuid);
      }
    },

    /** Replace a collection entry with the (persisted) version of itself. */
    updateLocalObject: (obj) => {
      const collection = collectionKeyOf(get().getTypeFromUuid(obj.uuid));
      if (!collection) return;
      set((s) =>
        collectionUpdate(
          collection,
          collectionOf(s, collection).map((o) => (o.uuid === obj.uuid ? obj : o)),
        ),
      );
    },

    /** Drop every loaded object and close every tab — used by a full refresh. */
    resetObjects: () => {
      set(emptyCollections());
      get().deselectObject();
    },

    getObjectFromUuid: (uuid) => {
      if (!uuid) return null;
      const type = get().getTypeFromUuid(uuid);
      if (!type) return null;
      const found = (get().getObjects(type) ?? []).find((obj) => obj.uuid === uuid);
      return (found ?? null) as SelectableObject | Role | null;
    },

    getTypeFromUuid: (uuid) => {
      const match = META_TYPE_NAMES.find((name) =>
        collectionOf(get(), META_TYPES[name].collection).some((item) => item.uuid === uuid),
      );
      if (!match) console.warn(`Unknown type for uuid: ${uuid}`);
      return match ?? null;
    },

    /**
     * The objects a role references, each carrying that reference's min/max.
     *
     * Returns copies: min/max belong to the reference, not to the referenced
     * object, and writing them onto the shared collection entry would leak a
     * relation's cardinality into every other view of the same class.
     */
    getObjectsFromRole: (role) =>
      allReferences(role).flatMap((reference) => {
        const object = get().getObjectFromUuid(reference.uuid);
        if (!object) return [];
        return [{ ...object, min: reference.min, max: reference.max } as unknown as AnyReference];
      }),

    // ----- children of the selected object ---------------------------------

    addChild: (uuid, type) => {
      const handler = CHILD_HANDLERS[type]?.add;
      if (!handler) {
        console.warn(`Cannot add a child of type: ${type}`);
        return;
      }
      handler(uuid);
    },

    removeChild: (uuid, type) => {
      const key = type ?? get().getTypeFromUuid(uuid) ?? "";
      const handler = CHILD_HANDLERS[key]?.remove;
      if (!handler) {
        console.warn(`Cannot remove a child of type: ${key}`);
        return;
      }
      handler(uuid);
    },

    /**
     * Set the cardinality of the reference identified by `uuid`, wherever it
     * sits: on an attribute type's single role, or on either end of a relation
     * class.
     */
    updateMinMax: (uuid, min, max) => {
      const object = get().selectedObject;
      if (!object) {
        console.warn("No selected object to update");
        return;
      }

      const roles: Role[] = [];
      switch (get().type) {
        case "AttributeType":
        case "Role": {
          const role = (object as AttributeType).role;
          if (role) roles.push(role);
          break;
        }
        case "RelationClass": {
          const relationClass = object as Relationclass;
          roles.push(relationClass.role_from, relationClass.role_to);
          break;
        }
        default:
          console.warn(`Unsupported type for updateMinMax: ${get().type}`);
          return;
      }

      if (!roles.some((role) => setReferenceBounds(role, uuid, min, max))) {
        console.warn(`Reference with uuid ${uuid} not found`);
        return;
      }
      log(`Updated min/max for reference ${uuid}: min ${min}, max ${max}`, "info");
      commit();
    },
  };
});

/** Re-exported so callers can name a role reference's target type. */
export type { AnyReference };
