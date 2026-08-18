import { Stack } from "@mui/material";
import { TextField } from "@mui/material";
import FieldsetSection from "@/views/common/FieldsetSection";

/**
 * Form inputs bound to a path on the object being edited, e.g. `"name"` or
 * `"coordinates_2d.x"`. Each is fully controlled: it renders the object's
 * current value and writes every change straight back through `update`, which
 * commits it to the store (and so to the tab's undo history).
 */

/** Writes `value` to `path` on the object being edited. */
export type UpdateFn = (path: string, value: unknown) => void;

/** The object being edited is a union of every meta type; fields index into it. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Bindable = any;

/** Read a (possibly nested) path, tolerating absent intermediate objects. */
function readPath(obj: Bindable, path: string): unknown {
  return path.split(".").reduce<Bindable>((cur, key) => cur?.[key], obj);
}

export function BoundText({
  label,
  path,
  obj,
  update,
  multiline,
  rows,
  maxLength,
}: {
  label: string;
  path: string;
  obj: Bindable;
  update: UpdateFn;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <TextField
      label={label}
      value={(readPath(obj, path) as string | undefined) ?? ""}
      onChange={(event) => update(path, event.target.value)}
      multiline={multiline}
      rows={multiline ? rows : undefined}
      inputProps={maxLength ? { maxLength } : undefined}
      fullWidth
      size="small"
    />
  );
}

/** A numeric field. An emptied input clears the value rather than storing 0. */
export function BoundNumber({
  label,
  path,
  obj,
  update,
}: {
  label: string;
  path: string;
  obj: Bindable;
  update: UpdateFn;
}) {
  return (
    <TextField
      label={label}
      type="number"
      value={(readPath(obj, path) as number | undefined) ?? ""}
      onChange={(event) =>
        update(path, event.target.value === "" ? null : Number(event.target.value))
      }
      fullWidth
      size="small"
    />
  );
}

/** An X/Y/Z row bound to `obj.<base>.{x,y,z}`. */
export function CoordFieldset({
  legend,
  base,
  obj,
  update,
}: {
  legend: string;
  base: string;
  obj: Bindable;
  update: UpdateFn;
}) {
  return (
    <FieldsetSection legend={legend} dense>
      <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
        {(["x", "y", "z"] as const).map((axis) => (
          <BoundNumber
            key={axis}
            label={axis.toUpperCase()}
            path={`${base}.${axis}`}
            obj={obj}
            update={update}
          />
        ))}
      </Stack>
    </FieldsetSection>
  );
}
