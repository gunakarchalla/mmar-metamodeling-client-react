import { Card, CardActionArea, Box, Tooltip } from "@mui/material";
import { MetaObject } from "@gds/models/meta/Metamodel_metaobjects.structure";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { backendService } from "@/resources/services/backend-service";

interface Props {
  object: MetaObject;
  type: string;
}

// Ports object-card.{ts,html}. A clickable MUI Card showing the object's icon
// (extracted from its geometry/VizRep via the store's getIcon) and its name.
// Clicking saves the current selection then selects this object — exactly like
// the original onButtonClicked.
export default function ObjectCard({ object }: Props) {
  // Subscribe to the selected object's uuid so the highlight re-renders on change.
  const selectedUuid = useSelectedObjectStore((s) => s.selectedObject?.uuid);
  const isSelected = selectedUuid === object.uuid;

  function onButtonClicked() {
    const store = useSelectedObjectStore.getState();
    if (store.getSelectedObject()) {
      // no await — prevent a blocking UI when changing the selected object
      backendService.saveSelectedObject();
    }
    store.setSelectedObject(object.uuid);
  }

  const iconSrc = useSelectedObjectStore
    .getState()
    .getIcon(object.geometry?.toString() ?? "");

  return (
    <Tooltip title={object.description ? object.description : object.name} arrow>
      <Card
        className="object-card"
        id={object.uuid}
        sx={{
          width: 96,
          m: 0.5,
          outline: isSelected ? "2px solid" : "none",
          outlineColor: "primary.main",
          bgcolor: isSelected ? "action.selected" : "background.paper",
        }}
      >
        <CardActionArea
          onClick={onButtonClicked}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            p: 1,
          }}
        >
          <Box
            component="img"
            src={iconSrc}
            alt={object.name}
            sx={{ width: 48, height: 48, objectFit: "contain" }}
          />
          <Box
            sx={{
              mt: 0.5,
              fontSize: 12,
              textAlign: "center",
              width: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {object.name}
          </Box>
        </CardActionArea>
      </Card>
    </Tooltip>
  );
}
