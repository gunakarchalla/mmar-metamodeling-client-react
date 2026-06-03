import { TextField, Box, Stack, Typography } from "@mui/material";

type UpdateFn = (path: string, value: unknown) => void;

// A controlled text/textarea field bound to a (possibly nested) path of the
// selected object. Mirrors `value.bind="selectedObject.<path>"`.
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: any;
  update: UpdateFn;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <TextField
      label={label}
      value={readPath(obj, path) ?? ""}
      onChange={(e) => update(path, e.target.value)}
      multiline={multiline}
      rows={multiline ? rows : undefined}
      inputProps={maxLength ? { maxLength } : undefined}
      fullWidth
      size="small"
    />
  );
}

// A controlled numeric field bound to a nested path. Empty -> null, else Number.
export function BoundNumber({
  label,
  path,
  obj,
  update,
}: {
  label: string;
  path: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: any;
  update: UpdateFn;
}) {
  const value = readPath(obj, path);
  return (
    <TextField
      label={label}
      type="number"
      value={value ?? ""}
      onChange={(e) =>
        update(path, e.target.value === "" ? null : Number(e.target.value))
      }
      fullWidth
      size="small"
    />
  );
}

// An X/Y/Z coordinate fieldset bound to obj.<base>.{x,y,z}. Mirrors the bordered
// fieldsets in general-tab.html.
export function CoordFieldset({
  legend,
  base,
  obj,
  update,
}: {
  legend: string;
  base: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: any;
  update: UpdateFn;
}) {
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        p: 1.5,
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
        {legend}
      </Typography>
      <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
        <BoundNumber label="X" path={`${base}.x`} obj={obj} update={update} />
        <BoundNumber label="Y" path={`${base}.y`} obj={obj} update={update} />
        <BoundNumber label="Z" path={`${base}.z`} obj={obj} update={update} />
      </Stack>
    </Box>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readPath(obj: any, path: string): any {
  const parts = path.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[p];
  }
  return cur;
}
