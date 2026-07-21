import { Card, CardActionArea, Box, Tooltip } from "@mui/material";
import { MetaObject } from "@gds/models/meta/Metamodel_metaobjects.structure";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";

interface Props {
  object: MetaObject;
  type: string;
}

// Ports object-card.{ts,html}. A clickable MUI Card showing the object's icon
// (extracted from its geometry/VizRep via the store's getIcon) and its name.
// Clicking opens the object in a tab, or focuses the tab it is already open in.
// The card of the *active* tab is disabled so it cannot be reselected; cards of
// background tabs stay clickable and are marked with a dotted outline.
//
// The original onButtonClicked saved the outgoing selection before switching.
// That is gone: with tabs, edits are kept alive in each tab's working copy and
// are persisted deliberately (Save / Ctrl+S / the close prompt) — auto-saving on
// every card click would make the unsaved-changes marker unreachable.
export default function ObjectCard({ object }: Props) {
  // Subscribe to the selected object's uuid so the highlight re-renders on change.
  const selectedUuid = useSelectedObjectStore((s) => s.selectedObject?.uuid);
  const isSelected = selectedUuid === object.uuid;
  // Boolean selector: only cards whose open-state actually flipped re-render.
  const isOpenInTab = useSelectedObjectStore((s) =>
    s.openTabs.some((t) => t.uuid === object.uuid),
  );

  function onButtonClicked() {
    useSelectedObjectStore.getState().setSelectedObject(object.uuid);
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
          outline: isSelected ? "2px solid" : isOpenInTab ? "1px dashed" : "none",
          outlineColor: "primary.main",
          bgcolor: isSelected ? "action.selected" : "background.paper",
        }}
      >
        <CardActionArea
          onClick={onButtonClicked}
          disabled={isSelected}
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
