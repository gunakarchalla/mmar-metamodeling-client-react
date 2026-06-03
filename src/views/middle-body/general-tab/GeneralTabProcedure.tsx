import { Box, Typography } from "@mui/material";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { BoundText } from "./fields";

// Ports general-tab-procedure.{ts,html}: a Procedure definition textarea.
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
      <BoundText
        label="Procedure definition"
        path="definition"
        obj={obj}
        update={update}
        multiline
        rows={10}
      />
    </Box>
  );
}
