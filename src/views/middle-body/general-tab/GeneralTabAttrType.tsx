import FieldsetSection from "@/views/common/FieldsetSection";
import { BoundText } from "./fields";
import { useSelectedObjectForm } from "./useSelectedObjectForm";

/**
 * Attribute-type-only fields: the regular expression that attribute values of
 * this type must match.
 */
export default function GeneralTabAttrType() {
  const { object, update } = useSelectedObjectForm();
  if (!object) return null;

  return (
    <FieldsetSection legend="Attribute type">
      <BoundText label="RegEx" path="regex_value" obj={object} update={update} />
    </FieldsetSection>
  );
}
