import { ListItem, ListItemButton, ListItemIcon, ListItemText, Box, Tooltip } from "@mui/material";
import { MetaObject } from "@gds/models/meta/Metamodel_metaobjects.structure";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { vizRepIcon } from "@/resources/services/vizrep-icon";

/**
 * One row of a left-navigation list: the object's VizRep icon and its name.
 *
 * Clicking opens the object in an editor tab, or focuses the tab it is already
 * open in. The active tab's row is disabled so it cannot be reselected; rows of
 * objects open in a background tab stay clickable and are marked with a dashed
 * left border.
 *
 * Clicking a row deliberately does not save the object being left behind: each
 * tab keeps its edits alive in its own working copy, and saving is an explicit
 * act (the toolbar, Ctrl+S, or the prompt raised when closing a dirty tab).
 */
export default function ObjectListItem({ object }: { object: MetaObject }) {
  // Subscribing to the uuid alone keeps unrelated edits from re-rendering the row.
  const selectedUuid = useSelectedObjectStore((s) => s.selectedObject?.uuid);
  const isSelected = selectedUuid === object.uuid;
  // A boolean selector: only rows whose open state actually flipped re-render.
  const isOpenInTab = useSelectedObjectStore((s) =>
    s.openTabs.some((t) => t.uuid === object.uuid),
  );

  const iconSrc = vizRepIcon(object.geometry?.toString() ?? "");

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
          onClick={() => useSelectedObjectStore.getState().setSelectedObject(object.uuid)}
          disabled={isSelected}
          sx={{
            py: 0.25,
            pl: 1,
            // Solid for the selection, dashed for objects open in a background
            // tab. Rows with neither keep a transparent border of the same
            // width so their text does not shift.
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
