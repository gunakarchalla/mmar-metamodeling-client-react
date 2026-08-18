/**
 * Cloning helpers for the metamodel objects held in `selectedObjectStore`.
 *
 * Those objects are edited *in place* — a bound form field writes straight into
 * `selectedObject.name`, a structural tab pushes into `selectedObject.classes`.
 * That keeps the mutation code simple, but React only re-renders when it sees a
 * new object identity, and an undo stack is worthless if its snapshots keep
 * changing underneath it. These two functions supply the identities the store
 * needs, both preserving the prototype so the data-structure classes keep their
 * methods.
 */

/**
 * Copy `obj` into a fresh object with the same prototype and the same field
 * values. Cheap, and enough to make React subscribers re-render after an
 * in-place mutation, because the *reference they compare* has changed.
 */
export function reref<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== "object") return obj;
  return Object.assign(Object.create(Object.getPrototypeOf(obj)), obj);
}

/**
 * Recursively copy `value`, prototypes included.
 *
 * Undo snapshots need this rather than `reref`: the nested structures a shallow
 * copy keeps sharing (`classes`, `role_from.class_references`,
 * `has_table_attribute`, …) are exactly the ones the in-place mutators edit, so
 * a shallow snapshot would be rewritten by the very next edit and undo would
 * restore nothing.
 *
 * `seen` breaks reference cycles and preserves shared sub-objects as shared.
 */
export function deepClone<T>(value: T, seen = new WeakMap<object, unknown>()): T {
  // Primitives and functions are immutable for our purposes and shared as-is.
  // (`geometry` is typed `Function` by the shared data structures.)
  if (value === null || typeof value !== "object") return value;

  const already = seen.get(value as object);
  if (already !== undefined) return already as T;
  if (value instanceof Date) return new Date(value.getTime()) as T;

  const clone = (
    Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value))
  ) as Record<string, unknown>;
  seen.set(value as object, clone);
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    clone[key] = deepClone(nested, seen);
  }
  return clone as T;
}
