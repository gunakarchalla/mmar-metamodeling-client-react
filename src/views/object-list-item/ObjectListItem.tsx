import { ListItem, ListItemButton, ListItemIcon, ListItemText, Box, Tooltip } from "@mui/material";
import { MetaObject } from "@gds/models/meta/Metamodel_metaobjects.structure";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";

interface Props {
  object: MetaObject;
  type: string;
}

// Ports object-card.{ts,html}. A clickable list row showing the object's icon
// (extracted from its geometry/VizRep via the store's getIcon) and its name.
// Clicking opens the object in a tab, or focuses the tab it is already open in.
// The row of the *active* tab is disabled so it cannot be reselected; rows of
// background tabs stay clickable and are marked with a dashed left border.
//
// The original onButtonClicked saved the outgoing selection before switching.
// That is gone: with tabs, edits are kept alive in each tab's working copy and
// are persisted deliberately (Save / Ctrl+S / the close prompt) — auto-saving on
// every row click would make the unsaved-changes marker unreachable.
export default function ObjectListItem({ object }: Props) {
  // Subscribe to the selected object's uuid so the highlight re-renders on change.
  const selectedUuid = useSelectedObjectStore((s) => s.selectedObject?.uuid);
  const isSelected = selectedUuid === object.uuid;
  // Boolean selector: only rows whose open-state actually flipped re-render.
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
    <Tooltip
      title={object.description ? object.description : object.name}
      arrow
      placement="right"
    >
      <ListItem className="object-list-item" id={object.uuid} disablePadding>
        <ListItemButton
          dense
          selected={isSelected}
          onClick={onButtonClicked}
          disabled={isSelected}
          sx={{
            py: 0.25,
            pl: 1,
            // Mirrors the old tile outline: solid for the selection, dashed for
            // objects open in a background tab. The transparent border keeps
            // every row the same width so the text does not shift.
            borderLeft: "3px",
            borderLeftStyle: isSelected
              ? "solid"
              : isOpenInTab
                ? "dashed"
                : "solid",
            borderLeftColor: isSelected || isOpenInTab ? "primary.main" : "transparent",
            // MUI dims disabled buttons; the active tab's row must stay legible.
            "&.Mui-disabled": { opacity: 1 },
          }}
        >
          <ListItemIcon sx={{ minWidth: 30 }}>
            <Box
              component="img"
              src={iconSrc}
              alt={object.name}
              sx={{ width: 22, height: 22, objectFit: "contain" }}
            />
          </ListItemIcon>
          <ListItemText
            primary={object.name}
            primaryTypographyProps={{ noWrap: true, fontSize: 13 }}
          />
        </ListItemButton>
      </ListItem>
    </Tooltip>
  );
}
