import { memo, useMemo } from "react";
import { ListItem, ListItemButton, ListItemIcon, ListItemText, Box, Tooltip } from "@mui/material";
import { MetaObject } from "@gds/models/meta/Metamodel_metaobjects.structure";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { vizRepIconOf } from "@/resources/services/vizrep-icon";

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
 *
 * **Wrapped in `memo`, and that is load-bearing.** A list section can hold
 * hundreds of these, and the parent re-renders whenever the store republishes —
 * which every keystroke in the General tab does. Without `memo` each of those
 * keystrokes re-rendered every row in every open section: four MUI components
 * apiece, each re-serialising its `sx` through emotion. The row's props are the
 * object alone, so the default shallow comparison is exactly right.
 */

// Hoisted out of the render body. An `sx` object literal is a new value on every
// render, which defeats emotion's own style cache; these three are constant.
const ICON_SX = { minWidth: 30 } as const;
const IMAGE_SX = { width: 22, height: 22, objectFit: "contain" } as const;
const TEXT_SLOT_PROPS = { primary: { noWrap: true, sx: { fontSize: 13 } } } as const;

function ObjectListItem({ object }: { object: MetaObject }) {
  // Subscribing to the uuid alone keeps unrelated edits from re-rendering the row.
  const selectedUuid = useSelectedObjectStore((s) => s.selectedObject?.uuid);
  const isSelected = selectedUuid === object.uuid;
  // A boolean selector: only rows whose open state actually flipped re-render.
  const isOpenInTab = useSelectedObjectStore((s) =>
    s.openTabs.some((t) => t.uuid === object.uuid),
  );

  const iconSrc = vizRepIconOf(object.geometry);

  // The only `sx` that genuinely varies, so it is the only one worth memoising.
  const buttonSx = useMemo(
    () => ({
      py: 0.25,
      pl: 1,
      // Solid for the selection, dashed for objects open in a background
      // tab. Rows with neither keep a transparent border of the same
      // width so their text does not shift.
      borderLeft: "3px",
      borderLeftStyle: isSelected ? "solid" : isOpenInTab ? "dashed" : "solid",
      borderLeftColor: isSelected || isOpenInTab ? "primary.main" : "transparent",
      // MUI dims disabled buttons; the active tab's row must stay legible.
      "&.Mui-disabled": { opacity: 1 },
    }),
    [isSelected, isOpenInTab],
  );

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
          sx={buttonSx}
        >
          {/* `vizRepIcon` returns "" for a VizRep with no usable inline image, and an
              <img src=""> makes the browser re-request the current page (React 19 warns
              about it). The row keeps its indent either way: ListItemIcon's minWidth
              reserves the space whether or not an icon renders. */}
          <ListItemIcon sx={ICON_SX}>
            {iconSrc && (
              <Box
                component="img"
                src={iconSrc}
                alt={object.name}
                sx={IMAGE_SX}
              />
            )}
          </ListItemIcon>
          <ListItemText primary={object.name} slotProps={TEXT_SLOT_PROPS} />
        </ListItemButton>
      </ListItem>
    </Tooltip>
  );
}

export default memo(ObjectListItem);
