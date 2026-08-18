/**
 * The single source of truth for the eleven meta-object types the client works
 * with.
 *
 * Every type appears in three places — the in-memory collection it is stored in,
 * the REST path it is fetched from, and the label the UI shows — and those three
 * used to be spelled out again in a `switch` inside each consumer (the store's
 * `getObjects`/`setObjects`/`updateLocalObject`, the backend service's URL
 * builder, the left navigation, the object list). Adding a type meant editing all
 * of them and silently mis-behaving if one was missed. Describing each type once
 * here lets those consumers be derived from the table instead.
 */

/** Where a type's REST routes are mounted on the server. */
export type ApiScope = "metamodel" | "root";

export interface MetaTypeDescriptor {
  /** Field of `selectedObjectStore` that holds every loaded object of this type. */
  readonly collection: MetaCollectionKey;
  /** Path segment identifying this type in the server's REST routes. */
  readonly apiSegment: string;
  /**
   * `metamodel` types live under `/metamodel/<segment>`; `root` types (users and
   * user groups) are mounted directly at `/<segment>`.
   */
  readonly apiScope: ApiScope;
  /** Plural label used by the left navigation. */
  readonly label: string;
  /**
   * Whether the type gets its own section in the left navigation. Roles are
   * reachable only as references from an attribute type, so they have no list.
   */
  readonly listed: boolean;
  /** Whether the left-navigation section is restricted to administrators. */
  readonly adminOnly: boolean;
}

export type MetaCollectionKey =
  | "sceneTypes"
  | "classes"
  | "relationClasses"
  | "ports"
  | "files"
  | "attributeTypes"
  | "attributes"
  | "roles"
  | "procedures"
  | "userGroups"
  | "users";

/**
 * Declaration order is the order the left navigation renders its sections in.
 */
export const META_TYPES = {
  SceneType: {
    collection: "sceneTypes",
    apiSegment: "sceneTypes",
    apiScope: "metamodel",
    label: "Scene types",
    listed: true,
    adminOnly: false,
  },
  Class: {
    collection: "classes",
    apiSegment: "classes",
    apiScope: "metamodel",
    label: "Classes",
    listed: true,
    adminOnly: false,
  },
  RelationClass: {
    collection: "relationClasses",
    apiSegment: "relationclasses",
    apiScope: "metamodel",
    label: "Relation classes",
    listed: true,
    adminOnly: false,
  },
  Attribute: {
    collection: "attributes",
    apiSegment: "attributes",
    apiScope: "metamodel",
    label: "Attributes",
    listed: true,
    adminOnly: false,
  },
  AttributeType: {
    collection: "attributeTypes",
    apiSegment: "attributeTypes",
    apiScope: "metamodel",
    label: "Attribute types",
    listed: true,
    adminOnly: false,
  },
  Port: {
    collection: "ports",
    apiSegment: "ports",
    apiScope: "metamodel",
    label: "Ports",
    listed: true,
    adminOnly: false,
  },
  File: {
    collection: "files",
    apiSegment: "files",
    apiScope: "metamodel",
    label: "Files",
    listed: true,
    adminOnly: false,
  },
  Procedure: {
    collection: "procedures",
    apiSegment: "procedures",
    apiScope: "metamodel",
    label: "Procedures",
    listed: true,
    adminOnly: false,
  },
  User: {
    collection: "users",
    apiSegment: "users",
    apiScope: "root",
    label: "Users",
    listed: true,
    adminOnly: true,
  },
  UserGroup: {
    collection: "userGroups",
    apiSegment: "userGroups",
    apiScope: "root",
    label: "Usergroups",
    listed: true,
    adminOnly: true,
  },
  Role: {
    collection: "roles",
    apiSegment: "roles",
    apiScope: "metamodel",
    label: "Roles",
    listed: false,
    adminOnly: false,
  },
} as const satisfies Record<string, MetaTypeDescriptor>;

export type MetaTypeName = keyof typeof META_TYPES;

/** Every type name, in left-navigation order. */
export const META_TYPE_NAMES = Object.keys(META_TYPES) as MetaTypeName[];

/** The types that get their own left-navigation section. */
export const LISTED_META_TYPES = META_TYPE_NAMES.filter((name) => META_TYPES[name].listed);

/**
 * Spellings of a type name that reach us from elsewhere and have to resolve to a
 * canonical one: the General tab's attribute-type picker passes the human-facing
 * `"Attribute Type"`, and objects returned by the server carry the same `type`
 * tag the request was made with.
 */
const TYPE_ALIASES: Readonly<Record<string, MetaTypeName>> = {
  "Attribute Type": "AttributeType",
  Relationclass: "RelationClass",
  Usergroup: "UserGroup",
};

/** Resolve a possibly-aliased type name, or `undefined` if it names no type. */
export function resolveMetaType(type: string | null | undefined): MetaTypeName | undefined {
  if (!type) return undefined;
  if (type in META_TYPES) return type as MetaTypeName;
  return TYPE_ALIASES[type];
}

/** Look up a type's descriptor, or `undefined` if it names no type. */
export function metaTypeDescriptor(
  type: string | null | undefined,
): MetaTypeDescriptor | undefined {
  const name = resolveMetaType(type);
  return name ? META_TYPES[name] : undefined;
}

/** Store collection field holding objects of `type`, or `undefined`. */
export function collectionKeyOf(type: string | null | undefined): MetaCollectionKey | undefined {
  return metaTypeDescriptor(type)?.collection;
}

/**
 * REST path for a type's collection, e.g. `metamodel/relationclasses` or
 * `userGroups`. Returns `undefined` for anything that is not a meta type.
 */
export function apiPathOf(type: string | null | undefined): string | undefined {
  const descriptor = metaTypeDescriptor(type);
  if (!descriptor) return undefined;
  return descriptor.apiScope === "metamodel"
    ? `metamodel/${descriptor.apiSegment}`
    : descriptor.apiSegment;
}
