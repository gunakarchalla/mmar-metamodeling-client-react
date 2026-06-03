import { Box, FormControlLabel, Switch, Typography, Stack } from "@mui/material";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";

// Ports general-tab-usr-grp.{ts,html}: the seven "can create …" switches on a
// UserGroup.
const FLAGS: { path: string; label: string }[] = [
  { path: "can_create_scenetype", label: "can create scenetypes" },
  { path: "can_create_attribute", label: "can create attributes" },
  { path: "can_create_attribute_type", label: "can create attribute type" },
  { path: "can_create_class", label: "can create class" },
  { path: "can_create_relationclass", label: "can create relationclass" },
  { path: "can_create_port", label: "can create port" },
  { path: "can_create_role", label: "can create role" },
];

export default function GeneralTabUsrGrp() {
  const obj = useSelectedObjectStore((s) => s.selectedObject);
  const update = useSelectedObjectStore((s) => s.updateSelectedField);
  if (!obj) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o = obj as any;

  return (
    <Box
      component="fieldset"
      sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.5, mt: 2 }}
    >
      <Typography component="legend" variant="caption" color="text.secondary">
        User group
      </Typography>
      <Stack>
        {FLAGS.map((f) => (
          <FormControlLabel
            key={f.path}
            control={
              <Switch
                checked={!!o[f.path]}
                onChange={(e) => update(f.path, e.target.checked)}
              />
            }
            label={f.label}
          />
        ))}
      </Stack>
    </Box>
  );
}
