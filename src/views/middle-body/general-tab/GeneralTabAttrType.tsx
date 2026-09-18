import { is_valid_pattern, type AttributeType } from "@gds";
import FieldsetSection from "@/views/common/FieldsetSection";
import { BoundText } from "./fields";
import { useSelectedObjectForm } from "./useSelectedObjectForm";

/**
 * Attribute-type-only fields: the regular expression that attribute values of
 * this type must match.
 *
 * The expression is checked as it is typed, and the type cannot be saved while it
 * does not compile. A pattern is written by hand, so "^(abc" is a SyntaxError rather
 * than a pattern that refuses everything: stored, it is a rule no client can apply,
 * and the attributes of the type would be left unconstrained without saying so.
 * Half-typed patterns are reported the same way and stop being reported once they are
 * finished, which is what makes the report worth reading.
 */
export default function GeneralTabAttrType() {
  const { object, update } = useSelectedObjectForm();
  if (!object) return null;

  const patternInvalid = !is_valid_pattern((object as AttributeType).regex_value);

  return (
    <FieldsetSection legend="Attribute type">
      <BoundText
        label="RegEx"
        path="regex_value"
        obj={object}
        update={update}
        error={patternInvalid}
        helperText={
          patternInvalid
            ? "This is not a regular expression that can be applied. The attribute type cannot be saved until it is."
            : undefined
        }
      />
    </FieldsetSection>
  );
}
