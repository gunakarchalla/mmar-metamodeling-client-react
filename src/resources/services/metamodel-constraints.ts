import { attribute_value_violations, is_valid_pattern } from "@gds";
import type { Attribute } from "@gds/models/meta/Metamodel_attributes.structure";
import type { AttributeType } from "@gds/models/meta/Metamodel_attributetypes.structure";

/**
 * What stops a metamodel object from being saved.
 *
 * An attribute type's regular expression is what every value stored under an attribute
 * of that type has to match, and the metamodel is where those values are decided long
 * before a model is built: the default value an instance starts out holding, and the
 * facets a modeller can pick from. Saving one the expression refuses would hand the
 * modeling client instance values the server then refuses — a 403 that costs the
 * modeller the whole scene, rolled back to its last snapshot.
 *
 * So the same questions are asked here, as the author types, and again by the server
 * when the object is written. The verdict comes from mmar-global-data-structure, so
 * the three applications cannot drift apart.
 *
 * The panels report these while editing (see GeneralTabAttribute and
 * GeneralTabAttrType); `backend-service.saveObject` refuses the save.
 */

/**
 * An attribute whose default value or facets its own attribute type refuses.
 *
 * `default_value` and `facets` are read as "" when unset, which is what the database
 * stores for them and what the attribute is saved as.
 */
export function attributeSaveProblems(attribute: Attribute): string[] {
  return attribute_value_violations(
    { default_value: attribute.default_value ?? "", facets: attribute.facets ?? "" },
    attribute.attribute_type?.regex_value,
  );
}

/**
 * An attribute type whose regular expression cannot be applied at all.
 *
 * That is the whole check. An attribute type is the more fundamental object: it states
 * what values of that type look like, and the attributes pointing at it are held to it
 * when THEY are saved, as their instances are held to them.
 */
export function attributeTypeSaveProblems(attributeType: AttributeType): string[] {
  if (is_valid_pattern(attributeType.regex_value)) return [];
  return ["its regular expression is not one that can be applied"];
}
