import { useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";

// A minimal single-select object picker used by the General-tab Attribute
// (objecttype "Attribute Type") and Relationclass (objecttype "Bendpoint")
// variants. It mirrors the relevant slice of modal-object-select: resolve the
// candidate list for the pseudo-type, search by name/description, and on confirm
// dispatch through the store's addChild(uuid, objecttype).
//
// NOTE: the full-featured modal-object-select (multi-select, sortable columns,
// reused across the structural tabs) is built in Phase 6; this is the focused
// single-select picker the General tab needs.
export default function InlineObjectPicker({
  objecttype,
  label,
}: {
  objecttype: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const addChild = useSelectedObjectStore((s) => s.addChild);

  // Resolve candidate objects exactly like modal-object-select.attached():
  // Bendpoint -> Class candidates, everything else -> getObjects(objecttype).
  const candidateType = objecttype === "Bendpoint" ? "Class" : objecttype;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = useSelectedObjectStore.getState().getObjects(candidateType) ?? [];

  const titleType = objecttype === "Role" ? "reference" : objecttype;

  const filtered = items.filter((item) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      item.name?.toLowerCase().includes(s) ||
      item.description?.toLowerCase().includes(s)
    );
  });

  function pick(uuid: string) {
    addChild(uuid, objecttype);
    setOpen(false);
    setSearch("");
  }

  return (
    <>
      <Button variant="outlined" size="small" onClick={() => setOpen(true)}>
        {label ?? `Select ${titleType}`}
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Select {titleType}</DialogTitle>
        <DialogContent>
          <TextField
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            size="small"
            sx={{ my: 1 }}
          />
          <TableContainer component={Paper} sx={{ maxHeight: 360 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow
                    key={item.uuid}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => pick(item.uuid)}
                  >
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
