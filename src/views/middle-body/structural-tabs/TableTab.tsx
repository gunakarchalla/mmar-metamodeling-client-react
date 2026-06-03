import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import ParentChildSelect from "@/views/common/ParentChildSelect";

// Ports table-tab: AttributeType -> columns (has_table_attribute). The "Column"
// pseudo-type routes addChild (attributeTypeAddColumn) / removeChild
// (attributeTypeRemoveColumn); ParentChildSelect rebuilds each row via
// ColumnStructure and assigns sequence. sortable=false (sequence-ordered).
export default function TableTab() {
  const selectedObject = useSelectedObjectStore((s) => s.selectedObject);
  return (
    <ParentChildSelect
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items={(selectedObject as any)?.has_table_attribute}
      objecttypetoadd="Column"
      sortable={false}
    />
  );
}
