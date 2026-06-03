import { Box, Typography } from "@mui/material";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { BoundText } from "./fields";

// Ports general-tab-user.{ts,html}: a Username field on a User.
export default function GeneralTabUser() {
  const obj = useSelectedObjectStore((s) => s.selectedObject);
  const update = useSelectedObjectStore((s) => s.updateSelectedField);
  if (!obj) return null;

  return (
    <Box
      component="fieldset"
      sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.5, mt: 2 }}
    >
      <Typography component="legend" variant="caption" color="text.secondary">
        User
      </Typography>
      <BoundText label="Username" path="username" obj={obj} update={update} />
    </Box>
  );
}
