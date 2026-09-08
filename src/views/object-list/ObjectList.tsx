import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Box, TextField, Button, InputAdornment, Divider, List } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { MetaObject } from "@gds/models/meta/Metamodel_metaobjects.structure";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { useAuthStore } from "@/resources/store/authStore";
import { backendService } from "@/resources/services/backend-service";
import ObjectListItem from "@/views/object-list-item/ObjectListItem";

/**
 * Shared stand-in for "this type has no collection", so the fallback below is a
 * constant rather than a new array on every store read — a fresh one would make
 * the subscription fire on every write regardless of what changed.
 */
const EMPTY: MetaObject[] = [];

/**
 * The section's own scroll box, and the row geometry the windowing below needs.
 *
 * A section used to grow to the height of its contents and scroll as part of the
 * left panel. That made the panel one continuous column, but it also meant every
 * row of an expanded section was mounted — and a type with several hundred
 * objects cost about a second to expand, roughly half of it MUI's per-row
 * `Tooltip`. Giving the section a bounded viewport of its own is what makes
 * windowing simple enough to be safe: the visible range is decided by one
 * element's `scrollTop` against a known height, rather than by working out where
 * the list sits inside a scroll container it shares with nine other sections.
 */
const LIST_VIEWPORT_HEIGHT = 360;

/** Rows are uniform. This is only the starting guess; a real row is measured. */
const ESTIMATED_ROW_HEIGHT = 34;

/** Rows kept mounted beyond each edge, so a fast scroll does not show gaps. */
const OVERSCAN = 8;

/**
 * Below this many rows the section renders whole and the windowing stays out of
 * the way entirely. Short lists are already cheap, and rendering them in one
 * piece keeps the common case identical to what it always was.
 */
const WINDOWING_THRESHOLD = 60;

interface RowWindow {
  /** First and last (exclusive) row to actually render. */
  start: number;
  end: number;
  /** Heights standing in for the rows above and below, so the scrollbar is true. */
  padTop: number;
  padBottom: number;
}

/**
 * Which slice of `count` rows is worth mounting, given where the box is scrolled.
 *
 * The row height is measured from a real row rather than assumed, so the
 * scrollbar stays honest if the theme's density ever changes. Measurement is
 * skipped where it cannot work (jsdom reports every element as zero-height), and
 * the estimate carries it — the window is only ever an optimisation, and
 * over-estimating the visible range costs a few extra rows, never a wrong one.
 */
function useRowWindow(count: number, viewportRef: RefObject<HTMLDivElement | null>): RowWindow {
  const [scrollTop, setScrollTop] = useState(0);
  const [rowHeight, setRowHeight] = useState(ESTIMATED_ROW_HEIGHT);
  const windowed = count > WINDOWING_THRESHOLD;

  useLayoutEffect(() => {
    if (!windowed) return;
    const row = viewportRef.current?.querySelector(".object-list-item");
    const measured = row?.getBoundingClientRect().height ?? 0;
    if (measured > 0 && measured !== rowHeight) setRowHeight(measured);
  }, [windowed, count, rowHeight, viewportRef]);

  // Track the box's scroll position. Reading it from the event rather than from
  // state keeps this correct when the browser clamps `scrollTop` itself, which it
  // does whenever a search shortens the list under a scrolled-down viewport.
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el || !windowed) return;
    const onScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    // The list may have shrunk since the last scroll event; resync immediately.
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [windowed, count, viewportRef]);

  return useMemo(() => {
    if (!windowed) return { start: 0, end: count, padTop: 0, padBottom: 0 };

    const first = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
    const visible = Math.ceil(LIST_VIEWPORT_HEIGHT / rowHeight) + OVERSCAN * 2;
    const start = Math.min(first, Math.max(0, count - 1));
    const end = Math.min(count, start + visible);

    return {
      start,
      end,
      padTop: start * rowHeight,
      padBottom: (count - end) * rowHeight,
    };
  }, [windowed, count, scrollTop, rowHeight]);
}

/**
 * One left-navigation section: every loaded object of a single meta type, with
 * a search box and the buttons to create and delete one.
 */
export default function ObjectList({ type }: { type: string }) {
  const [searchTerm, setSearchTerm] = useState("");
  const viewportRef = useRef<HTMLDivElement>(null);

  // Every one of these selectors returns a *stable* value — the collection array
  // itself, a uuid string, a type string, a boolean. That matters more here than
  // anywhere else in the app: a section holds one row component per object, so a
  // selector that returned a fresh value on each store write would re-render the
  // whole list on every keystroke in the General tab. Subscribing to
  // `s.selectedObject` did exactly that, because `commit()` republishes the
  // working copy under a new identity on every edit; the uuid is all this
  // component actually needs from it.
  const objects = useSelectedObjectStore((s) => s.getObjects(type) ?? EMPTY);
  const selectedUuid = useSelectedObjectStore((s) => s.selectedObject?.uuid ?? null);
  const selectedType = useSelectedObjectStore((s) => s.type);
  const isAuthenticated = useAuthStore((s) => s.currentUser != null);

  // The selection is global to the store, so a section may only treat it as its
  // own — otherwise picking a row in one section would enable "Remove selected"
  // in every other section too.
  const hasSelectionHere = selectedUuid != null && selectedType === type;

  const visibleObjects = useMemo(() => {
    const sorted = [...objects].sort((a, b) => a.name.localeCompare(b.name));
    if (!searchTerm) return sorted;
    const term = searchTerm.toLowerCase();
    return sorted.filter((item) => item.name.toLowerCase().includes(term));
  }, [objects, searchTerm]);

  const { start, end, padTop, padBottom } = useRowWindow(visibleObjects.length, viewportRef);

  async function addNewObject() {
    const created = await backendService.createNewObject(type);
    if (created) useSelectedObjectStore.getState().setSelectedObject(created.uuid);
  }

  async function removeSelected() {
    if (!selectedUuid) return;
    // Deleting closes the object's tab (and focuses a neighbour) through the
    // store, so there is nothing to deselect here — and deselecting would close
    // every *other* open tab as well.
    await backendService.deleteObject(selectedUuid, type);
  }

  function search(term: string) {
    setSearchTerm(term);
    // A narrowed list is a different list; start it from the top rather than
    // wherever the previous one happened to be scrolled to.
    if (viewportRef.current) viewportRef.current.scrollTop = 0;
  }

  return (
    <Box sx={{ px: 1, pb: 1 }}>
      <TextField
        className="search-left-nav"
        size="small"
        fullWidth
        label="search"
        value={searchTerm}
        disabled={!isAuthenticated}
        onChange={(event) => search(event.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          },
        }}
        sx={{ mb: 1 }}
      />

      <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          disabled={!isAuthenticated}
          onClick={addNewObject}
        >
          Add new
        </Button>
        <Button
          variant="outlined"
          size="small"
          color="error"
          startIcon={<DeleteIcon />}
          disabled={!hasSelectionHere}
          onClick={removeSelected}
        >
          Remove selected
        </Button>
      </Box>

      <Divider className="solid_hr_list" sx={{ mb: 1 }} />

      {/* The section's own scroll box. Scroll deliberately *does* chain out of
          here once the list ends, so reaching the bottom of one section carries
          on into the left panel; it is the panel that stops the chain at the
          document (see the theme's `overflow: hidden` note in the code guide). */}
      <Box ref={viewportRef} sx={{ maxHeight: LIST_VIEWPORT_HEIGHT, overflowY: "auto" }}>
        <List className="object-item-list" dense disablePadding>
          {/* Spacers are list items, not divs: a <div> child of a <ul> is invalid
              markup. They carry the height of the rows that are not mounted, so
              the scrollbar reflects the whole list rather than the rendered slice.
              Their height is an inline style rather than `sx` on purpose — it
              changes with every scroll step, and routing that through emotion
              would mint a fresh CSS class per frame. */}
          {padTop > 0 && <li aria-hidden style={{ height: padTop }} />}
          {visibleObjects.slice(start, end).map((object) => (
            <ObjectListItem key={object.uuid} object={object} />
          ))}
          {padBottom > 0 && <li aria-hidden style={{ height: padBottom }} />}
        </List>
      </Box>
    </Box>
  );
}
