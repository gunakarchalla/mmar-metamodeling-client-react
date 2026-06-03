import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import ParentChildSelect from "@/views/common/ParentChildSelect";

// Ports classes-tab: SceneType -> Classes.
export default function ClassesTab() {
  const selectedObject = useSelectedObjectStore((s) => s.selectedObject);
  return (
    <ParentChildSelect
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items={(selectedObject as any)?.classes}
      objecttypetoadd="Class"
      sortable
    />
  );
}
