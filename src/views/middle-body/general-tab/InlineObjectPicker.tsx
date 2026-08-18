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
import { candidatesFor } from "@/views/common/child-candidates";
import { useObjectTable } from "@/views/common/object-table";

/**
 * A single-select object picker for the General tab's "points at one object"
 * fields — an attribute's type, a relation class's bendpoint.
 *
 * Its list-editing counterpart is `ModalObjectSelect`, which picks several
 * objects at once and needs the extra columns to tell them apart.
 */
export default function InlineObjectPicker({ childType }: { childType: string }) {
  const [open, setOpen] = useState(false);
  const addChild = useSelectedObjectStore((s) => s.addChild);
  const getTypeFromUuid = useSelectedObjectStore((s) => s.getTypeFromUuid);

  const { searchTerm, setSearchTerm, visibleRows } = useObjectTable(
    candidatesFor(childType),
    getTypeFromUuid,
    { sortable: false },
  );

  function pick(uuid: string) {
    addChild(uuid, childType);
    setSearchTerm("");
    setOpen(false);
  }

  return (
    <>
      <Button variant="outlined" size="small" onClick={() => setOpen(true)}>
        Select {childType}
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Select {childType}</DialogTitle>
        <DialogContent>
          <TextField
            label="Search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
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
                {visibleRows.map((item) => (
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
