import { useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";

// Ports modal-object-select.{ts,html}. A dialog with a searchable / sortable
// table of candidate objects for a pseudo-type; single- or multi-select. On
// confirm it dispatches selectedObjectStore.addChild(uuid, objecttype) for each
// selection. The MDC `view-model.ref` dialog + `data-mdc-dialog-action` pattern
// is replaced with React open state + a `closing` callback (mirrors `closing.bind`).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

interface SortState {
  column: string;
  direction: "asc" | "desc";
}

// The pseudo-types for which a "Type" column is shown (mirrors the if.bind set).
function showsTypeColumn(objecttype: string): boolean {
  return (
    objecttype === "Source" ||
    objecttype === "Destination" ||
    objecttype === "Role" ||
    objecttype === "read_right" ||
    objecttype === "write_right" ||
    objecttype === "delete_right" ||
    objecttype === "can_create_instance"
  );
}

// Resolve the candidate list for a pseudo-type (mirrors attached()).
function resolveItems(objecttype: string): AnyObj[] {
  const store = useSelectedObjectStore.getState();
  if (showsTypeColumn(objecttype)) {
    return store.getObjects("All") ?? [];
  } else if (objecttype === "Column") {
    return store.getObjects("Attribute") ?? [];
  } else if (objecttype === "Bendpoint") {
    return store.getObjects("Class") ?? [];
  } else if (objecttype === "Procedure") {
    return store.getObjects("Procedure") ?? [];
  } else {
    return store.getObjects(objecttype) ?? [];
  }
}

export default function ModalObjectSelect({
  objecttype,
  ismultiselect = true,
  onClose,
}: {
  objecttype: string;
  ismultiselect?: boolean;
  onClose?: (action: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUuids, setSelectedUuids] = useState<string[]>([]);
  const [currentSort, setCurrentSort] = useState<SortState>({
    column: "name",
    direction: "asc",
  });

  const addChild = useSelectedObjectStore((s) => s.addChild);
  const getTypeFromUuid = useSelectedObjectStore((s) => s.getTypeFromUuid);
  const getIcon = useSelectedObjectStore((s) => s.getIcon);
  // Re-resolve candidate list whenever the dialog opens.
  const items = useMemo(
    () => (open ? resolveItems(objecttype) : []),
    [open, objecttype],
  );

  const titleType = objecttype === "Role" ? "reference" : objecttype;

  const sorted = useMemo(() => {
    const copy = [...items];
    const { column, direction } = currentSort;
    const getVal = (o: AnyObj) =>
      column === "type" ? getTypeFromUuid(o.uuid) : o[column];
    copy.sort((a, b) => {
      let result = 0;
      const av = getVal(a);
      const bv = getVal(b);
      if (av < bv) result = -1;
      if (av > bv) result = 1;
      return direction === "asc" ? result : -result;
    });
    return copy;
  }, [items, currentSort, getTypeFromUuid]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return sorted;
    const s = searchTerm.toLowerCase();
    // Match on name, description AND the object's type so that searching for a
    // type name (e.g. "SceneType") returns every object of that type, not just
    // the few whose name/description happen to contain the text.
    return sorted.filter((item) => {
      const type = getTypeFromUuid(item.uuid);
      return (
        item.name?.toLowerCase().includes(s) ||
        item.description?.toLowerCase().includes(s) ||
        type?.toLowerCase().includes(s)
      );
    });
  }, [sorted, searchTerm, getTypeFromUuid]);

  function isSelected(uuid: string): boolean {
    return selectedUuids.includes(uuid);
  }

  function selectObject(uuid: string) {
    setSelectedUuids((prev) => {
      if (!ismultiselect) {
        return prev.includes(uuid) ? [] : [uuid];
      }
      return prev.includes(uuid)
        ? prev.filter((u) => u !== uuid)
        : [...prev, uuid];
    });
  }

  function sortList(column: string) {
    setCurrentSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column, direction: "asc" },
    );
  }

  function reset() {
    setSelectedUuids([]);
    setSearchTerm("");
  }

  function handleClose(action: string) {
    if (action === "ok") {
      // addObjects(): dispatch addChild for each unique selection.
      for (const uuid of new Set(selectedUuids)) {
        addChild(uuid, objecttype);
      }
    }
    reset();
    setOpen(false);
    if (onClose) onClose(action);
  }

  const showType = showsTypeColumn(objecttype);
  const plural =
    selectedUuids.length > 1 &&
    objecttype !== "Class" &&
    objecttype !== "RelationClass"
      ? "s"
      : "";

  const sortIndicator = (column: string) =>
    currentSort.column === column ? (
      currentSort.direction === "asc" ? (
        <ArrowUpwardIcon fontSize="inherit" sx={{ ml: 0.5, verticalAlign: "middle" }} />
      ) : (
        <ArrowDownwardIcon fontSize="inherit" sx={{ ml: 0.5, verticalAlign: "middle" }} />
      )
    ) : null;

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<AddIcon />}
        onClick={() => {
          setSelectedUuids([]);
          setOpen(true);
        }}
      >
        Add New {titleType}
      </Button>

      <Dialog
        open={open}
        onClose={() => handleClose("cancel")}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Add new {titleType}</DialogTitle>
        <DialogContent dividers>
          <TextField
            label="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
            size="small"
            inputProps={{ maxLength: 256 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 1 }}
          />
          <Divider sx={{ mb: 1 }} />
          <TableContainer component={Paper} sx={{ maxHeight: 420 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Image</TableCell>
                  {showType && (
                    <TableCell
                      sx={{ cursor: "pointer" }}
                      onClick={() => sortList("type")}
                    >
                      Type
                      {sortIndicator("type")}
                    </TableCell>
                  )}
                  <TableCell
                    sx={{ cursor: "pointer" }}
                    onClick={() => sortList("name")}
                  >
                    Name
                    {sortIndicator("name")}
                  </TableCell>
                  <TableCell
                    sx={{ cursor: "pointer" }}
                    onClick={() => sortList("description")}
                  >
                    Description
                    {sortIndicator("description")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow
                    key={item.uuid}
                    hover
                    selected={isSelected(item.uuid)}
                    sx={{
                      cursor: "pointer",
                      "&.Mui-selected": {
                        backgroundColor: "primary.light",
                      },
                      "&.Mui-selected:hover": {
                        backgroundColor: "primary.main",
                      },
                    }}
                    onClick={() => selectObject(item.uuid)}
                  >
                    <TableCell>
                      <img
                        alt={`image of ${item.name}`}
                        className="image-list"
                        style={{ width: 32, height: 32, objectFit: "contain" }}
                        src={getIcon(item.geometry?.toString() ?? "")}
                      />
                    </TableCell>
                    {showType && (
                      <TableCell>{getTypeFromUuid(item.uuid)}</TableCell>
                    )}
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            disabled={selectedUuids.length < 1}
            onClick={() => handleClose("ok")}
          >
            Add {titleType}
            {plural}
          </Button>
          <Button variant="outlined" onClick={() => handleClose("cancel")}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
