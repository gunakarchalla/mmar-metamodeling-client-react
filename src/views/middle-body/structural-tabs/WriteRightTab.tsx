import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import ParentChildSelect from "@/views/common/ParentChildSelect";

// Ports write-right-tab: UserGroup -> write_right uuid array. The "write_right"
// pseudo-type routes addChild (selectedObjectAddWriteRight) / removeChild.
export default function WriteRightTab() {
  const selectedObject = useSelectedObjectStore((s) => s.selectedObject);
  return (
    <ParentChildSelect
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items={(selectedObject as any)?.write_right}
      objecttypetoadd="write_right"
      sortable
    />
  );
}
