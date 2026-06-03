import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import ParentChildSelect from "@/views/common/ParentChildSelect";

// Ports ports-tab: SceneType/Class/RelationClass -> Ports.
export default function PortsTab() {
  const selectedObject = useSelectedObjectStore((s) => s.selectedObject);
  return (
    <ParentChildSelect
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items={(selectedObject as any)?.ports}
      objecttypetoadd="Port"
      sortable
    />
  );
}
