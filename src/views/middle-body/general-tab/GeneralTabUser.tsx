import FieldsetSection from "@/views/common/FieldsetSection";
import { BoundText } from "./fields";
import { useSelectedObjectForm } from "./useSelectedObjectForm";

/** User-only fields: the login name. */
export default function GeneralTabUser() {
  const { object, update } = useSelectedObjectForm();
  if (!object) return null;

  return (
    <FieldsetSection legend="User">
      <BoundText label="Username" path="username" obj={object} update={update} />
    </FieldsetSection>
  );
}
