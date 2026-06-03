import {
  Box,
  Typography,
  Stack,
  Card,
  CardContent,
  Tooltip,
  TextField,
  MenuItem,
} from "@mui/material";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { Attribute } from "@gds/models/meta/Metamodel_attributes.structure";
import { BoundNumber } from "./fields";
import InlineObjectPicker from "./InlineObjectPicker";

// Ports general-tab-attribute.{ts,html}: the Attribute variant — AttributeType
// selector, min/max, facets (parsed from the `|`-separated string) and a
// default-value field that is either a free-text input validated against the
// attribute type's regex, or a dropdown populated from the facets.
export default function GeneralTabAttribute() {
  const obj = useSelectedObjectStore((s) => s.selectedObject) as Attribute | null;
  const update = useSelectedObjectStore((s) => s.updateSelectedField);
  const getIcon = useSelectedObjectStore((s) => s.getIcon);
  if (!obj) return null;

  // populateFacetList(): facets is a `|`-separated string; empty -> [].
  const facetsList: string[] = obj.facets ? obj.facets.split("|") : [];

  // getImage(): icon of the selected attribute type's geometry.
  const attrTypeImage = obj.attribute_type
    ? getIcon(obj.attribute_type.geometry?.toString() ?? "")
    : "";

  // validateDefaultValue(): the default value must match the attribute type's regex.
  let defaultValueInvalid = false;
  if (facetsList.length === 0 && obj.attribute_type?.regex_value && obj.default_value) {
    const regex =
      typeof obj.attribute_type.regex_value === "string"
        ? new RegExp(obj.attribute_type.regex_value)
        : obj.attribute_type.regex_value;
    defaultValueInvalid = !regex.test(obj.default_value);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasAttrType = !!(obj as any).attribute_type_uuid || !!obj.attribute_type;

  return (
    <Box
      component="section"
      sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.5, mt: 2 }}
    >
      <Typography component="legend" variant="caption" color="text.secondary">
        Attribute
      </Typography>

      <Stack spacing={2} sx={{ mt: 1 }}>
        {/* Attribute Type selector */}
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography>Attribute Type:</Typography>
          {hasAttrType && obj.attribute_type && (
            <Tooltip title={obj.attribute_type.name ?? ""} arrow>
              <Card className="object-card" sx={{ width: 120 }}>
                <CardContent
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    p: 1,
                    "&:last-child": { pb: 1 },
                  }}
                >
                  {attrTypeImage && (
                    <Box
                      component="img"
                      src={attrTypeImage}
                      alt={obj.attribute_type.name}
                      sx={{ width: 40, height: 40, objectFit: "contain" }}
                    />
                  )}
                  <Box sx={{ fontSize: 12, mt: 0.5, textAlign: "center" }}>
                    {obj.attribute_type.name}
                  </Box>
                </CardContent>
              </Card>
            </Tooltip>
          )}
          <InlineObjectPicker objecttype="Attribute Type" />
        </Stack>

        {/* Min / Max */}
        <Stack direction="row" spacing={2}>
          <BoundNumber label="Minimum" path="min" obj={obj} update={update} />
          <BoundNumber label="Maximum" path="max" obj={obj} update={update} />
        </Stack>

        {/* Facets */}
        <TextField
          label="Facets"
          value={obj.facets ?? ""}
          onChange={(e) => update("facets", e.target.value)}
          helperText="The facets must be separated by a | character."
          fullWidth
          size="small"
        />

        {/* Default value: free text (regex-validated) or dropdown from facets */}
        {facetsList.length === 0 ? (
          <TextField
            label="Default value"
            value={obj.default_value ?? ""}
            onChange={(e) => update("default_value", e.target.value)}
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
            value={obj.default_value ?? ""}
            onChange={(e) => update("default_value", e.target.value)}
            fullWidth
            size="small"
          >
            <MenuItem value="">Select a default value</MenuItem>
            {facetsList.map((facet) => (
              <MenuItem key={facet} value={facet}>
                {facet}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Stack>
    </Box>
  );
}
