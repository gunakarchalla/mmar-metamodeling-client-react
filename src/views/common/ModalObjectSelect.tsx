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
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { vizRepIconOf } from "@/resources/services/vizrep-icon";
import IconCell from "./IconCell";
import { candidatesFor, showsTypeColumn } from "./child-candidates";
import { useObjectTable } from "./object-table";
import SortableHeaderCell from "./SortableHeaderCell";

/**
 * "Add New …" — a dialog listing every object that may be added to a child
 * list, with search and sorting. Confirming attaches each picked object to the
 * selected object through the store.
 */
export default function ModalObjectSelect({
  childType,
  onClose,
}: {
  childType: string;
  onClose?: (action: "ok" | "cancel") => void;
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  const addChild = useSelectedObjectStore((s) => s.addChild);
  const getTypeFromUuid = useSelectedObjectStore((s) => s.getTypeFromUuid);

  // Candidates are read once per opening: the store's collections do not change
  // while a modal dialog is up.
  const candidates = useMemo(() => (open ? candidatesFor(childType) : []), [open, childType]);
  const { searchTerm, setSearchTerm, sort, sortBy, visibleRows } = useObjectTable(
    candidates,
    getTypeFromUuid,
  );

  const showType = showsTypeColumn(childType);
  const title = childType === "Role" ? "reference" : childType;
  // "Add Classes" would be wrong — those type names are already plural.
  const plural =
    picked.length > 1 && childType !== "Class" && childType !== "RelationClass" ? "s" : "";

  function togglePicked(uuid: string) {
    setPicked((prev) =>
      prev.includes(uuid) ? prev.filter((u) => u !== uuid) : [...prev, uuid],
    );
  }

  function close(action: "ok" | "cancel") {
    if (action === "ok") {
      for (const uuid of new Set(picked)) {
        addChild(uuid, childType);
      }
    }
    setPicked([]);
    setSearchTerm("");
    setOpen(false);
    onClose?.(action);
  }

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<AddIcon />}
        onClick={() => {
          setPicked([]);
          setOpen(true);
        }}
      >
        Add New {title}
      </Button>

      <Dialog open={open} onClose={() => close("cancel")} fullWidth maxWidth="md">
        <DialogTitle>Add new {title}</DialogTitle>
        <DialogContent dividers>
          <TextField
            label="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            fullWidth
            size="small"
            slotProps={{
              htmlInput: { maxLength: 256 },
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
          <Divider sx={{ mb: 1 }} />
          <TableContainer component={Paper} sx={{ maxHeight: 420 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Image</TableCell>
                  {showType && (
                    <SortableHeaderCell column="type" label="Type" sort={sort} sortBy={sortBy} />
                  )}
                  <SortableHeaderCell column="name" label="Name" sort={sort} sortBy={sortBy} />
                  <SortableHeaderCell
                    column="description"
                    label="Description"
                    sort={sort}
                    sortBy={sortBy}
                  />
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleRows.map((item) => (
                  <TableRow
                    key={item.uuid}
                    hover
                    selected={picked.includes(item.uuid)}
                    sx={{
                      cursor: "pointer",
                      "&.Mui-selected": { backgroundColor: "primary.light" },
                      "&.Mui-selected:hover": { backgroundColor: "primary.main" },
                    }}
                    onClick={() => togglePicked(item.uuid)}
                  >
                    <TableCell>
                      {/* An empty icon means "no image", not src="" — see ObjectListItem.
                          The empty span holds the column's 32px width so the table does
                          not reflow around a row whose VizRep carries no inline image. */}
                      <IconCell src={vizRepIconOf(item.geometry)} name={item.name} />
                    </TableCell>
                    {showType && <TableCell>{getTypeFromUuid(item.uuid)}</TableCell>}
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
            disabled={picked.length < 1}
            onClick={() => close("ok")}
          >
            Add {title}
            {plural}
          </Button>
          <Button variant="outlined" onClick={() => close("cancel")}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
