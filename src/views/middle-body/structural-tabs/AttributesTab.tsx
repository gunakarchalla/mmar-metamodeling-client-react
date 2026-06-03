import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import ParentChildSelect from "@/views/common/ParentChildSelect";

// Ports attributes-tab: SceneType/Class/RelationClass/Port -> Attributes.
export default function AttributesTab() {
  const selectedObject = useSelectedObjectStore((s) => s.selectedObject);
  return (
    <ParentChildSelect
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items={(selectedObject as any)?.attributes}
      objecttypetoadd="Attribute"
      sortable={false}
    />
  );
}
