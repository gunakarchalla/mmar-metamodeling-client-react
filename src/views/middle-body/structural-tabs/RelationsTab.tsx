import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import ParentChildSelect from "@/views/common/ParentChildSelect";

// Ports relations-tab: RelationClass -> Source / Destination roles. The two
// ParentChildSelect instances bind to role_from / role_to; the "Source" and
// "Destination" pseudo-types route addChild/removeChild/getObjectsFromRole.
export default function RelationsTab() {
  const selectedObject = useSelectedObjectStore((s) => s.selectedObject);
  return (
    <>
      <ParentChildSelect
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items={(selectedObject as any)?.role_from}
        objecttypetoadd="Source"
        sortable
      />
      <ParentChildSelect
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items={(selectedObject as any)?.role_to}
        objecttypetoadd="Destination"
        sortable
      />
    </>
  );
}
