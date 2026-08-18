import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import ParentChildSelect from "@/views/common/ParentChildSelect";
import { ChildListSpec } from "../tab-definitions";

/**
 * Every sub-tab other than "General" shows the same thing: one or two lists of
 * objects hanging off the object being edited, each with its own add and remove
 * controls. What differs between them is described by `lists`, which is why they
 * are declared as data rather than written out as a component apiece.
 */
export default function StructuralTab({ lists }: { lists: ChildListSpec[] }) {
  const selectedObject = useSelectedObjectStore((s) => s.selectedObject);

  return (
    <>
      {lists.map((list) => (
        <ParentChildSelect
          key={list.field}
          // The selected object is a union of every meta type; a tab is only
          // rendered for the types that have the field it reads.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          items={(selectedObject as any)?.[list.field]}
          childType={list.childType}
          sortable={list.sortable}
        />
      ))}
    </>
  );
}
