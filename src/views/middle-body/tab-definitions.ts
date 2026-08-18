/**
 * The sub-tabs the editor offers, in display order.
 *
 * Each row says which meta types the tab applies to and which lists of children
 * it shows. Keeping the two together is deliberate: they were once separate
 * tables keyed by the same labels, where a tab could be offered with nothing
 * behind it.
 *
 * "General" is the exception — it shows the object's own fields rather than a
 * child list, and so declares none.
 */

/** One list of children within a tab. */
export interface ChildListSpec {
  /** Field of the selected object holding the children. */
  field: string;
  /**
   * What `addChild`/`removeChild` should do with a uuid dropped on this list.
   * Usually a meta type name; the rest are slots of the parent that have no type
   * of their own ("Source"/"Destination", "Column", the user-group rights).
   */
  childType: string;
  /**
   * Whether the user may sort the list. Lists that carry an explicit order —
   * attributes and table columns, whose `sequence` decides how they are
   * rendered — are left unsorted so the reordering arrows stay meaningful.
   */
  sortable: boolean;
}

export interface TabDefinition {
  label: string;
  /** Meta types that offer this tab. */
  types: string[];
  lists: ChildListSpec[];
}

export const TAB_DEFINITIONS: TabDefinition[] = [
  {
    label: "General",
    types: [
      "SceneType",
      "Class",
      "RelationClass",
      "Port",
      "Attribute",
      "AttributeType",
      "User",
      "UserGroup",
      "Procedure",
      "File",
    ],
    lists: [],
  },
  {
    label: "Attributes",
    types: ["SceneType", "Class", "RelationClass", "Port"],
    lists: [{ field: "attributes", childType: "Attribute", sortable: false }],
  },
  {
    label: "Classes",
    types: ["SceneType"],
    lists: [{ field: "classes", childType: "Class", sortable: true }],
  },
  {
    // A relation class points at its two ends through a role each.
    label: "Relations",
    types: ["RelationClass"],
    lists: [
      { field: "role_from", childType: "Source", sortable: true },
      { field: "role_to", childType: "Destination", sortable: true },
    ],
  },
  {
    label: "Ports",
    types: ["SceneType", "Class", "RelationClass"],
    lists: [{ field: "ports", childType: "Port", sortable: true }],
  },
  {
    // An attribute type's single role, expanded into the objects it references.
    label: "Reference",
    types: ["AttributeType"],
    lists: [{ field: "role", childType: "Role", sortable: true }],
  },
  {
    label: "Table",
    types: ["AttributeType"],
    lists: [{ field: "has_table_attribute", childType: "Column", sortable: false }],
  },
  {
    label: "RelationClasses",
    types: ["SceneType"],
    lists: [{ field: "relationclasses", childType: "RelationClass", sortable: true }],
  },
  {
    label: "Read Right",
    types: ["UserGroup"],
    lists: [{ field: "read_right", childType: "read_right", sortable: true }],
  },
  {
    label: "Write Right",
    types: ["UserGroup"],
    lists: [{ field: "write_right", childType: "write_right", sortable: true }],
  },
  {
    label: "Delete Right",
    types: ["UserGroup"],
    lists: [{ field: "delete_right", childType: "delete_right", sortable: true }],
  },
  {
    label: "Can Create Instance",
    types: ["UserGroup"],
    lists: [{ field: "can_create_instance", childType: "can_create_instance", sortable: true }],
  },
  {
    label: "User Groups",
    types: ["User"],
    lists: [{ field: "has_user_group", childType: "UserGroup", sortable: true }],
  },
  {
    label: "Procedures",
    types: ["SceneType"],
    lists: [{ field: "procedures", childType: "Procedure", sortable: true }],
  },
];
