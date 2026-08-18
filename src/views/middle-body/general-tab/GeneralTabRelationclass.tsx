import { Typography, Stack, Button } from "@mui/material";
import RemoveIcon from "@mui/icons-material/Remove";
import { Relationclass } from "@gds/models/meta/Metamodel_relationclasses.structure";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import FieldsetSection from "@/views/common/FieldsetSection";
import ObjectPreviewCard from "@/views/common/ObjectPreviewCard";
import InlineObjectPicker from "./InlineObjectPicker";
import { useSelectedObjectForm } from "./useSelectedObjectForm";

/**
 * Relation-class-only fields: the bendpoint, a class drawn at the corner where
 * the relation changes direction.
 */
export default function GeneralTabRelationclass() {
  const { object, update } = useSelectedObjectForm();
  const getObjectFromUuid = useSelectedObjectStore((s) => s.getObjectFromUuid);

  const relationClass = object as Relationclass | null;
  if (!relationClass) return null;

  const bendpoint = relationClass.bendpoint
    ? getObjectFromUuid(relationClass.bendpoint)
    : null;

  return (
    <FieldsetSection legend="Relationclass">
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
        <Typography>Bendpoint:</Typography>
        {bendpoint && (
          <ObjectPreviewCard name={bendpoint.name} geometry={bendpoint.geometry} />
        )}
        <Stack spacing={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RemoveIcon />}
            disabled={!relationClass.bendpoint}
            onClick={() => update("bendpoint", null)}
          >
            Remove Bendpoint
          </Button>
          <InlineObjectPicker childType="Bendpoint" />
        </Stack>
      </Stack>
    </FieldsetSection>
  );
}
