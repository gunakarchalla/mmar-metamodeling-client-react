import { Box, Typography, Stack, Card, CardContent, Tooltip, Button } from "@mui/material";
import RemoveIcon from "@mui/icons-material/Remove";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { Relationclass } from "@gds/models/meta/Metamodel_relationclasses.structure";
import InlineObjectPicker from "./InlineObjectPicker";

// Ports general-tab-relationclass.{ts,html}: bendpoint selection on a
// RelationClass. The bendpoint is a Class uuid; the card shows the referenced
// object, "Remove Bendpoint" clears it, and the picker (objecttype "Bendpoint")
// sets it.
export default function GeneralTabRelationclass() {
  const obj = useSelectedObjectStore((s) => s.selectedObject) as Relationclass | null;
  const update = useSelectedObjectStore((s) => s.updateSelectedField);
  const getObjectFromUuid = useSelectedObjectStore((s) => s.getObjectFromUuid);
  const getIcon = useSelectedObjectStore((s) => s.getIcon);
  if (!obj) return null;

  const bendpointObj = obj.bendpoint ? getObjectFromUuid(obj.bendpoint) : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const image = bendpointObj ? getIcon((bendpointObj as any).geometry?.toString() ?? "") : "";

  function removeBendpoint() {
    update("bendpoint", null);
  }

  return (
    <Box
      component="section"
      sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.5, mt: 2 }}
    >
      <Typography component="legend" variant="caption" color="text.secondary">
        Relationclass
      </Typography>

      <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
        <Typography>Bendpoint:</Typography>
        {bendpointObj && (
          <Tooltip title={bendpointObj.name ?? ""} arrow>
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
                {image && (
                  <Box
                    component="img"
                    src={image}
                    alt={bendpointObj.name}
                    sx={{ width: 40, height: 40, objectFit: "contain" }}
                  />
                )}
                <Box sx={{ fontSize: 12, mt: 0.5, textAlign: "center" }}>
                  {bendpointObj.name}
                </Box>
              </CardContent>
            </Card>
          </Tooltip>
        )}

        <Stack spacing={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RemoveIcon />}
            disabled={!obj.bendpoint}
            onClick={removeBendpoint}
          >
            Remove Bendpoint
          </Button>
          <InlineObjectPicker objecttype="Bendpoint" />
        </Stack>
      </Stack>
    </Box>
  );
}
