import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import ParentChildSelect from "@/views/common/ParentChildSelect";

// Ports read-right-tab: UserGroup -> read_right uuid array. The "read_right"
// pseudo-type routes addChild (selectedObjectAddReadRight) / removeChild;
// ParentChildSelect resolves each uuid via getObjectFromUuid.
export default function ReadRightTab() {
  const selectedObject = useSelectedObjectStore((s) => s.selectedObject);
  return (
    <ParentChildSelect
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items={(selectedObject as any)?.read_right}
      objecttypetoadd="read_right"
      sortable
    />
  );
}
