import { Box, Typography } from "@mui/material";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { BoundText } from "./fields";

// Ports general-tab-attr-type.{ts,html}: a single RegEx field on an AttributeType.
export default function GeneralTabAttrType() {
  const obj = useSelectedObjectStore((s) => s.selectedObject);
  const update = useSelectedObjectStore((s) => s.updateSelectedField);
  if (!obj) return null;

  return (
    <Box
      component="fieldset"
      sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.5, mt: 2 }}
    >
      <Typography component="legend" variant="caption" color="text.secondary">
        Attribute type
      </Typography>
      <BoundText label="RegEx" path="regex_value" obj={obj} update={update} />
    </Box>
  );
}
