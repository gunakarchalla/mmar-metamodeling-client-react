import { useMemo, useState } from "react";
import { Box, TextField, Button, InputAdornment, Icon, Divider } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { MetaObject } from "@gds/models/meta/Metamodel_metaobjects.structure";
import {
  useSelectedObjectStore,
  SelectedObjectState,
} from "@/resources/store/selectedObjectStore";
import { useAuthStore } from "@/resources/store/authStore";
import { backendService } from "@/resources/services/backend-service";
import ObjectCard from "@/views/object-card/ObjectCard";

interface Props {
  type: string;
}

// Maps a type-tag to the store collection field that holds it.
const TYPE_TO_FIELD: Record<string, keyof SelectedObjectState> = {
  SceneType: "sceneTypes",
  Class: "classes",
  RelationClass: "relationClasses",
  Attribute: "attributes",
  AttributeType: "attributeTypes",
  Port: "ports",
  File: "files",
  Procedure: "procedures",
  User: "users",
  UserGroup: "userGroups",
};

// Ports object-list.{ts,html}. Reads its slice from the store by `type`, lets
// the user search/add/remove, and renders an ObjectCard per item.
export default function ObjectList({ type }: Props) {
  const [searchTerm, setSearchTerm] = useState("");

  const field = TYPE_TO_FIELD[type];
  const objectList = useSelectedObjectStore(
    (s) => s[field] as unknown as MetaObject[],
  );
  const selectedObject = useSelectedObjectStore((s) => s.selectedObject);
  const isAuthenticated = useAuthStore((s) => s.currentUser != null);

  // Sort alphabetically (original sorts in attached()) then filter by name.
  const filteredItems = useMemo(() => {
    const sorted = [...(objectList ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    if (!searchTerm) return sorted;
    const term = searchTerm.toLowerCase();
    return sorted.filter((item) => item.name.toLowerCase().includes(term));
  }, [objectList, searchTerm]);

  async function addNewObject() {
    const retrieved = await backendService.createNewObject(type);
    if (retrieved) {
      useSelectedObjectStore.getState().setSelectedObject(retrieved.uuid);
    }
  }

  async function removeObject() {
    if (!selectedObject) return;
    const res = await backendService.deleteObject(selectedObject.uuid, type);
    if (res && res.status === 200) {
      useSelectedObjectStore.getState().deselectObject();
    }
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
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Icon className="material-icons">search</Icon>
            </InputAdornment>
          ),
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
          disabled={!selectedObject}
          onClick={removeObject}
        >
          Remove selected
        </Button>
      </Box>
      <Divider className="solid_hr_list" sx={{ mb: 1 }} />
      <Box
        className="object-card-list"
        sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
      >
        {filteredItems.map((object) => (
          <ObjectCard key={object.uuid} object={object} type={type} />
        ))}
      </Box>
    </Box>
  );
}
