import { Box, Typography } from "@mui/material";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import BoundCodeEditor from "@/views/code-editor/BoundCodeEditor";

// Ports general-tab-procedure.{ts,html}: the Procedure definition. The original
// was a plain textarea; a procedure definition is JavaScript, so it gets a
// Monaco editor instead (same treatment as the VizRep geometry code).
export default function GeneralTabProcedure() {
  const obj = useSelectedObjectStore((s) => s.selectedObject);
  const update = useSelectedObjectStore((s) => s.updateSelectedField);
  if (!obj) return null;

  return (
    <Box
      component="fieldset"
      sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.5, mt: 2 }}
    >
      <Typography component="legend" variant="caption" color="text.secondary">
        Procedure definition
      </Typography>
      <BoundCodeEditor
        value={(obj as { definition?: string }).definition ?? ""}
        onChange={(v) => update("definition", v)}
      />
    </Box>
  );
}
