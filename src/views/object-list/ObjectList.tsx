import { useMemo, useState } from "react";
import { Box, TextField, Button, InputAdornment, Divider, List } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { useAuthStore } from "@/resources/store/authStore";
import { backendService } from "@/resources/services/backend-service";
import ObjectListItem from "@/views/object-list-item/ObjectListItem";

/**
 * One left-navigation section: every loaded object of a single meta type, with
 * a search box and the buttons to create and delete one.
 */
export default function ObjectList({ type }: { type: string }) {
  const [searchTerm, setSearchTerm] = useState("");

  const objects = useSelectedObjectStore((s) => s.getObjects(type) ?? []);
  const selectedObject = useSelectedObjectStore((s) => s.selectedObject);
  const selectedType = useSelectedObjectStore((s) => s.type);
  const isAuthenticated = useAuthStore((s) => s.currentUser != null);

  // The selection is global to the store, so a section may only treat it as its
  // own — otherwise picking a row in one section would enable "Remove selected"
  // in every other section too.
  const hasSelectionHere = selectedObject != null && selectedType === type;

  const visibleObjects = useMemo(() => {
    const sorted = [...objects].sort((a, b) => a.name.localeCompare(b.name));
    if (!searchTerm) return sorted;
    const term = searchTerm.toLowerCase();
    return sorted.filter((item) => item.name.toLowerCase().includes(term));
  }, [objects, searchTerm]);

  async function addNewObject() {
    const created = await backendService.createNewObject(type);
    if (created) useSelectedObjectStore.getState().setSelectedObject(created.uuid);
  }

  async function removeSelected() {
    if (!selectedObject) return;
    // Deleting closes the object's tab (and focuses a neighbour) through the
    // store, so there is nothing to deselect here — and deselecting would close
    // every *other* open tab as well.
    await backendService.deleteObject(selectedObject.uuid, type);
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
        onChange={(event) => setSearchTerm(event.target.value)}
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

      <List className="object-item-list" dense disablePadding>
        {visibleObjects.map((object) => (
          <ObjectListItem key={object.uuid} object={object} />
        ))}
      </List>
    </Box>
  );
}
