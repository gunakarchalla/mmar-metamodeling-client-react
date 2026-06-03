import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import ParentChildSelect from "@/views/common/ParentChildSelect";

// Ports delete-right-tab: UserGroup -> delete_right uuid array. The
// "delete_right" pseudo-type routes addChild (selectedObjectAddDeleteRight) /
// removeChild.
export default function DeleteRightTab() {
  const selectedObject = useSelectedObjectStore((s) => s.selectedObject);
  return (
    <ParentChildSelect
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items={(selectedObject as any)?.delete_right}
      objecttypetoadd="delete_right"
      sortable
    />
  );
}
