import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import ParentChildSelect from "@/views/common/ParentChildSelect";

// Ports reference-tab: AttributeType -> role references. The single `role`
// object is expanded into its reference objects by getObjectsFromRole inside
// ParentChildSelect; the "Role" pseudo-type routes addChild
// (selectedObjectAddReferenceRole) / removeChild (selectedObjectRemoveReferenceRole).
export default function ReferenceTab() {
  const selectedObject = useSelectedObjectStore((s) => s.selectedObject);
  return (
    <ParentChildSelect
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items={(selectedObject as any)?.role}
      objecttypetoadd="Role"
      sortable
    />
  );
}
