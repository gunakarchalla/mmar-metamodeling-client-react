// What the metamodeling client refuses to save, and why.
//
// The cases use the real regexes the database ships for the pre-defined attribute
// types (mmar-database/init.sql), because the point of these checks is that the
// metamodeling client, the modeling client and the server answer the same way: an
// attribute saved with a default value its type refuses hands every model built from
// it a value the server then refuses, which costs the modeller their scene.
import { describe, it, expect } from "vitest";
import { attributeSaveProblems, attributeTypeSaveProblems } from "./metamodel-constraints";

const FLOAT_REGEX = "^[-+]?[0-9]*\\.?[0-9]+([eE][-+]?[0-9]+)?$";
const INTEGER_REGEX = "^([0-9])*$";

/** An attribute of the given type, shaped as the API sends it. */
function attribute(
  fields: { default_value?: string | null; facets?: string | null; name?: string },
  regex_value: string | null = FLOAT_REGEX,
  typeUuid = "at-1",
) {
  return {
    uuid: "attr-1",
    name: fields.name ?? "Weight",
    default_value: fields.default_value,
    facets: fields.facets,
    attribute_type: { uuid: typeUuid, name: "Float", regex_value },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

/** An attribute type carrying the pattern under test. */
function attributeType(regex_value: string | null, uuid = "at-1") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { uuid, name: "Float", regex_value } as any;
}

describe("attributeSaveProblems", () => {
  it("passes an attribute whose default value and facets its type allows", () => {
    expect(attributeSaveProblems(attribute({ default_value: "1.5" }))).toEqual([]);
    expect(
      attributeSaveProblems(attribute({ default_value: "2", facets: "1|2|0.5" })),
    ).toEqual([]);
  });

  it("refuses a default value the attribute type does not allow", () => {
    const problems = attributeSaveProblems(attribute({ default_value: "heavy" }));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("default value");
  });

  it("refuses an unset default on a type that wants a value, and allows it on one that does not", () => {
    // An attribute with no default starts every instance out empty, so the empty value
    // is what is checked - whether it is allowed is the attribute type's business.
    expect(attributeSaveProblems(attribute({ default_value: "" }))).toHaveLength(1);
    expect(attributeSaveProblems(attribute({ default_value: undefined }))).toHaveLength(1);
    expect(attributeSaveProblems(attribute({ default_value: null }))).toHaveLength(1);
    expect(
      attributeSaveProblems(attribute({ default_value: "" }, INTEGER_REGEX)),
    ).toEqual([]);
  });

  it("names the facets the attribute type refuses", () => {
    const problems = attributeSaveProblems(
      attribute({ default_value: "1", facets: "1|two|3" }),
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('"two"');
  });

  it("reads no facets as no values, and an empty facet as a value", () => {
    expect(attributeSaveProblems(attribute({ default_value: "1", facets: "" }))).toEqual([]);
    expect(attributeSaveProblems(attribute({ default_value: "1", facets: null }))).toEqual([]);
    // "|||" is four empty choices, which a type that wants a number refuses.
    expect(
      attributeSaveProblems(attribute({ default_value: "1", facets: "|||" })),
    ).toHaveLength(1);
  });

  it("passes anything when the attribute type states no regex", () => {
    expect(
      attributeSaveProblems(attribute({ default_value: "anything", facets: "a|b" }, null)),
    ).toEqual([]);
  });
});

describe("attributeTypeSaveProblems", () => {
  it("passes a regular expression that can be applied", () => {
    expect(attributeTypeSaveProblems(attributeType(FLOAT_REGEX))).toEqual([]);
    expect(attributeTypeSaveProblems(attributeType(null))).toEqual([]);
  });

  it("refuses a regular expression that cannot be applied", () => {
    const problems = attributeTypeSaveProblems(attributeType("^([unclosed"));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("not one that can be applied");
  });

  it("does not question the attributes that use the type", () => {
    // An attribute type is the more fundamental object: narrowing it is allowed, and
    // the attributes pointing at it answer for their own values when they are saved.
    expect(attributeTypeSaveProblems(attributeType(INTEGER_REGEX))).toEqual([]);
  });
});
