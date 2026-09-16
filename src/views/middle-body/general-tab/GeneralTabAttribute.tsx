import { Typography, Stack, TextField, MenuItem } from "@mui/material";
import { Attribute } from "@gds/models/meta/Metamodel_attributes.structure";
import FieldsetSection from "@/views/common/FieldsetSection";
import ObjectPreviewCard from "@/views/common/ObjectPreviewCard";
import { BoundNumber } from "./fields";
import InlineObjectPicker from "./InlineObjectPicker";
import { useSelectedObjectForm } from "./useSelectedObjectForm";

/**
 * Attribute-only fields: which attribute type it has, how many values it may
 * hold, its facets, and its default value.
 *
 * Facets are a `|`-separated list of the values the attribute may take. Whether
 * they are present decides how the default value is entered — picked from the
 * facets, or typed freely and checked against the attribute type's regular
 * expression.
 */
export default function GeneralTabAttribute() {
  const { object, update } = useSelectedObjectForm();
  const attribute = object as Attribute | null;
  if (!attribute) return null;

  const facets = attribute.facets ? attribute.facets.split("|") : [];
  const attributeType = attribute.attribute_type;

  const defaultValueInvalid =
    facets.length === 0 &&
    !!attributeType?.regex_value &&
    !!attribute.default_value &&
    !new RegExp(attributeType.regex_value).test(attribute.default_value);

  return (
    <FieldsetSection legend="Attribute">
      <Stack spacing={2} sx={{ mt: 1 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Typography>Attribute Type:</Typography>
          {attributeType && (
            <ObjectPreviewCard name={attributeType.name} geometry={attributeType.geometry} />
          )}
          <InlineObjectPicker childType="Attribute Type" />
        </Stack>

        <Stack direction="row" spacing={2}>
          <BoundNumber label="Minimum" path="min" obj={attribute} update={update} />
          <BoundNumber label="Maximum" path="max" obj={attribute} update={update} />
        </Stack>

        <TextField
          label="Facets"
          value={attribute.facets ?? ""}
          onChange={(event) => update("facets", event.target.value)}
          helperText="The facets must be separated by a | character."
          fullWidth
          size="small"
        />

        {facets.length === 0 ? (
          <TextField
            label="Default value"
            value={attribute.default_value ?? ""}
            onChange={(event) => update("default_value", event.target.value)}
            error={defaultValueInvalid}
            helperText={
              defaultValueInvalid
                ? "The default value must match the regular expression of the attribute type."
                : undefined
            }
            multiline
            rows={3}
            fullWidth
            size="small"
          />
        ) : (
          <TextField
            select
            label="Default value"
            value={attribute.default_value ?? ""}
            onChange={(event) => update("default_value", event.target.value)}
            fullWidth
            size="small"
          >
            <MenuItem value="">Select a default value</MenuItem>
            {facets.map((facet) => (
              <MenuItem key={facet} value={facet}>
                {facet}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Stack>
    </FieldsetSection>
  );
}
