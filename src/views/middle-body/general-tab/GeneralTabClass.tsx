import { Box, FormControlLabel, Switch, Typography, Stack } from "@mui/material";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";

// Ports general-tab-class.{ts,html}: Reusable / Abstract switches on a Class.
export default function GeneralTabClass() {
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
        Class
      </Typography>
      <Stack direction="row" spacing={2}>
        <FormControlLabel
          control={
            <Switch
              checked={!!o.is_reusable}
              onChange={(e) => update("is_reusable", e.target.checked)}
            />
          }
          label="Reusable"
        />
        <FormControlLabel
          control={
            <Switch
              checked={!!o.is_abstract}
              onChange={(e) => update("is_abstract", e.target.checked)}
            />
          }
          label="Abstract"
        />
      </Stack>
    </Box>
  );
}
