import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import ParentChildSelect from "@/views/common/ParentChildSelect";

// Ports can-create-instance-tab: UserGroup -> can_create_instance uuid array.
// The "can_create_instance" pseudo-type routes addChild
// (selectedObjectAddCanCreateInstance) / removeChild.
export default function CanCreateInstanceTab() {
  const selectedObject = useSelectedObjectStore((s) => s.selectedObject);
  return (
    <ParentChildSelect
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items={(selectedObject as any)?.can_create_instance}
      objecttypetoadd="can_create_instance"
      sortable
    />
  );
}
