import FieldsetSection from "@/views/common/FieldsetSection";
import BoundCodeEditor from "@/views/code-editor/BoundCodeEditor";
import { useSelectedObjectForm } from "./useSelectedObjectForm";

/**
 * Procedure-only fields: the procedure body. It is JavaScript, so it is edited
 * in a code editor rather than a plain text area.
 */
export default function GeneralTabProcedure() {
  const { object, update } = useSelectedObjectForm();
  if (!object) return null;

  return (
    <FieldsetSection legend="Procedure definition">
      <BoundCodeEditor
        value={(object as { definition?: string }).definition ?? ""}
        onChange={(value) => update("definition", value)}
      />
    </FieldsetSection>
  );
}
