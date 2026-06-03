import { Box } from "@mui/material";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import ParentChildSelect from "@/views/common/ParentChildSelect";

// Ports relationclasses-tab: SceneType -> RelationClasses.
export default function RelationClassesTab() {
  const selectedObject = useSelectedObjectStore((s) => s.selectedObject);
  return (
    <Box className="relationclasses-tab">
      <ParentChildSelect
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items={(selectedObject as any)?.relationclasses}
        objecttypetoadd="RelationClass"
        sortable
      />
    </Box>
  );
}
