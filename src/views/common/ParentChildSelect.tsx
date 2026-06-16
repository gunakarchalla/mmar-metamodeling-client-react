import { useMemo, useState } from "react";
import {
  Box,
  Button,
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
  Select,
  MenuItem,
  IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RemoveIcon from "@mui/icons-material/Remove";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { useLogStore } from "@/resources/store/logStore";
import { textify } from "@/resources/util/textify";
import { ColumnStructure } from "@gds/models/meta/Metamodel_columns.structure";

// Ports parent-child-select.{ts,html}: a searchable / sortable table of a
// parent object's children, with Add (via ModalObjectSelect), Remove, Edit,
// inline min/max editing, row reordering and per-type column visibility. The
// component reads/writes the current selectedObject through the store; it
// re-renders on every store `revision` bump (commit), so it always reflects the
// latest children after addChild/removeChild/updateMinMax.
import ModalObjectSelect from "./ModalObjectSelect";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

interface SortState {
  column: string;
  direction: "asc" | "desc";
}

function isRoleType(t: string): boolean {
  return t === "Source" || t === "Destination" || t === "Role";
}

function isRightType(t: string): boolean {
  return (
    t === "read_right" ||
    t === "write_right" ||
    t === "delete_right" ||
    t === "can_create_instance"
  );
}

// Inline min/max editor: controlled by the live reference value, persists via
// validateMinMax (updateMinMax) on change. Mirrors the two mdc-text-field cells.
function MinMaxCell({
  item,
  field,
  validate,
}: {
  item: AnyObj;
  field: "min" | "max";
  validate: (uuid: string, min: number, max: number) => void;
}) {
  return (
    <TextField
      type="number"
      size="small"
      label={field === "min" ? "Min" : "Max"}
      value={item[field] ?? 0}
      inputProps={{ min: field === "min" ? 0 : item.min ?? 0, step: 1 }}
      onChange={(e) => {
        const v = e.target.value === "" ? 0 : Number(e.target.value);
        const min = field === "min" ? v : Number(item.min ?? 0);
        const max = field === "max" ? v : Number(item.max ?? 0);
        validate(item.uuid, min, max);
      }}
      sx={{ width: 90 }}
    />
  );
}

// UI-component selector for Attribute / Column rows. The available components
// depend on whether the attribute defines facets (a `|`-separated string,
// same check as GeneralTabAttribute): with facets the value comes from a fixed
// set, so only Dropdown / Slider make sense; without facets the value is free,
// so only Text / Button are offered. The unavailable items are disabled.
function UiComponentCell({
  row,
  onChange,
}: {
  row: AnyObj;
  onChange: (value: string) => void;
}) {
  const hasFacets = !!row.facets && row.facets.split("|").length > 0;
  return (
    <Select
      size="small"
      displayEmpty
      value={textify(row.ui_component)}
      onChange={(e) => onChange(e.target.value)}
      sx={{ minWidth: 130 }}
    >
      <MenuItem value="text" disabled={hasFacets}>
        Text
      </MenuItem>
      <MenuItem value="dropdown" disabled={!hasFacets}>
        Dropdown
      </MenuItem>
      <MenuItem value="slider" disabled={!hasFacets}>
        Slider
      </MenuItem>
      <MenuItem value="button" disabled={hasFacets}>
        Button
      </MenuItem>
    </Select>
  );
}

export default function ParentChildSelect({
  objecttypetoadd = "object",
  items,
  sortable = false,
}: {
  objecttypetoadd?: string;
  items: AnyObj;
  sortable?: boolean;
}) {
  // Subscribe to revision so we recompute after every in-place store commit
  // (children arrays are mutated in place, so the `items` reference alone is
  // not enough to trigger recomputation).
  const revision = useSelectedObjectStore((s) => s.revision);
  const getObjectsFromRole = useSelectedObjectStore((s) => s.getObjectsFromRole);
  const getObjectFromUuid = useSelectedObjectStore((s) => s.getObjectFromUuid);
  const getTypeFromUuid = useSelectedObjectStore((s) => s.getTypeFromUuid);
  const getIcon = useSelectedObjectStore((s) => s.getIcon);
  const removeChild = useSelectedObjectStore((s) => s.removeChild);
  const setSelectedObject = useSelectedObjectStore((s) => s.setSelectedObject);
  const updateMinMax = useSelectedObjectStore((s) => s.updateMinMax);
  const commitSelected = useSelectedObjectStore((s) => s.commitSelected);
  const log = useLogStore((s) => s.log);

  const [selected, setSelected] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentSort, setCurrentSort] = useState<SortState>({
    column: "name",
    direction: "asc",
  });

  const titleType = objecttypetoadd === "Role" ? "Reference" : objecttypetoadd;
  const rightType = isRightType(objecttypetoadd);
  const roleType = isRoleType(objecttypetoadd);

  // Normalize items prop to an array (the live store array, or wrapped single).
  const itemsArray: AnyObj[] = useMemo(() => {
    if (!items) return [];
    return Array.isArray(items) ? items : [items];
    // `revision` is intentionally in the deps: children arrays mutate in place,
    // so the `items` reference alone does not signal a change.
  }, [items, revision]);

  // initializeItems(): build computedItems by pseudo-type.
  const computedItems: AnyObj[] = useMemo(() => {
    if (objecttypetoadd === "Role" || roleType) {
      const out: AnyObj[] = [];
      for (const item of itemsArray) {
        const objects = getObjectsFromRole(item);
        for (const object of objects) {
          out.push({ ...object });
        }
      }
      return out;
    } else if (objecttypetoadd === "Column") {
      let id = 1;
      const out: AnyObj[] = [];
      for (const item of itemsArray) {
        item.sequence = id;
        const newObject = new ColumnStructure({ ...item.attribute }, id++);
        out.push(newObject.get_attribute());
      }
      return out;
    } else if (rightType) {
      const out: AnyObj[] = [];
      for (const item of itemsArray) {
        const objectUuid = typeof item === "string" ? item : item.uuid;
        const object = getObjectFromUuid(objectUuid);
        if (object) out.push({ ...object });
      }
      return out;
    }
    // default: the children array itself. Sort by sequence when not sortable.
    const copy = [...itemsArray];
    if (!sortable) {
      copy.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
    }
    return copy;
    // `revision` keeps this in sync with in-place store mutations.
  }, [itemsArray, objecttypetoadd, sortable, revision]);

  // Apply sort (only meaningful when sortable) then filter by search term.
  const filteredItems: AnyObj[] = useMemo(() => {
    let list = computedItems;
    if (sortable) {
      const { column, direction } = currentSort;
      const getVal = (o: AnyObj) =>
        column === "type" ? getTypeFromUuid(o.uuid) : o[column];
      list = [...list].sort((a, b) => {
        let result = 0;
        const av = getVal(a);
        const bv = getVal(b);
        if (av < bv) result = -1;
        if (av > bv) result = 1;
        return direction === "asc" ? result : -result;
      });
    }
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter((item) => {
        if (item.description) {
          return (
            item.name.toLowerCase().includes(s) ||
            item.description.toLowerCase().includes(s)
          );
        }
        return item.name.toLowerCase().includes(s);
      });
    }
    return list;
  }, [computedItems, sortable, currentSort, searchTerm, getTypeFromUuid]);

  function removeObject(uuid: string | null = selected) {
    if (!uuid) return;
    removeChild(uuid, objecttypetoadd);
    setSelected(null);
  }

  function editObject() {
    if (selected) setSelectedObject(selected);
  }

  function sortList(column: string) {
    if (!sortable) return;
    setCurrentSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column, direction: "asc" },
    );
  }

  function getIndex(uuid: string): number {
    if (objecttypetoadd === "Column") {
      return itemsArray.findIndex((item) => item.attribute.uuid === uuid);
    }
    return itemsArray.findIndex((item) => item.uuid === uuid);
  }

  // moveRow reorders the live children array in place + reassigns sequence,
  // then commits so subscribers re-render (mirrors the original splice logic).
  function moveRow(uuid: string, direction: "up" | "down") {
    const index = getIndex(uuid);
    if (direction === "up" && index > 0) {
      const item = itemsArray[index];
      itemsArray.splice(index, 1);
      itemsArray.splice(index - 1, 0, item);
    } else if (direction === "down" && index < itemsArray.length - 1) {
      const item = itemsArray[index];
      itemsArray.splice(index, 1);
      itemsArray.splice(index + 1, 0, item);
    }
    for (let i = 0; i < itemsArray.length; i++) {
      itemsArray[i].sequence = i + 1;
    }
    commitSelected();
  }

  function validateMinMax(uuid: string, min: number, max: number) {
    if (min > max) {
      log("Minimum value cannot be greater than maximum value", "error");
      return false;
    }
    updateMinMax(uuid, min, max);
    return true;
  }

  function setUiComponent(row: AnyObj, value: string) {
    row.ui_component = value;
    commitSelected();
  }

  const showMove = !sortable;
  const showType = roleType;
  const showUiComponent =
    objecttypetoadd === "Attribute" || objecttypetoadd === "Column";
  const showMinMax = roleType;

  const sortIndicator = (column: string) =>
    sortable && currentSort.column === column ? (
      currentSort.direction === "asc" ? (
        <ArrowUpwardIcon fontSize="inherit" sx={{ ml: 0.5, verticalAlign: "middle" }} />
      ) : (
        <ArrowDownwardIcon fontSize="inherit" sx={{ ml: 0.5, verticalAlign: "middle" }} />
      )
    ) : null;

  return (
    <Box
      component="fieldset"
      sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2, m: 1 }}
    >
      <Box component="legend" sx={{ px: 1, fontWeight: 500 }}>
        {titleType}s
      </Box>

      <Box
        sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap", mb: 1 }}
      >
        <TextField
          label="search"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          inputProps={{ maxLength: 256 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        <ModalObjectSelect
          objecttype={objecttypetoadd}
          ismultiselect
          onClose={() => setSelected(null)}
        />

        <Button
          variant="outlined"
          size="small"
          startIcon={<RemoveIcon />}
          disabled={selected === null}
          onClick={() => removeObject()}
        >
          Remove selected
        </Button>

        <Button
          variant="outlined"
          size="small"
          startIcon={<EditIcon />}
          disabled={selected === null}
          onClick={() => editObject()}
        >
          Edit selected
        </Button>
      </Box>

      <Divider sx={{ mb: 1 }} />

      <TableContainer component={Paper} sx={{ maxHeight: 420 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {showMove && <TableCell />}
              <TableCell>Image</TableCell>
              {showType && (
                <TableCell sx={{ cursor: "pointer" }} onClick={() => sortList("type")}>
                  Type
                  {sortIndicator("type")}
                </TableCell>
              )}
              <TableCell sx={{ cursor: "pointer" }} onClick={() => sortList("name")}>
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
              {showUiComponent && <TableCell>UI Component</TableCell>}
              {showMinMax && <TableCell align="right">Min</TableCell>}
              {showMinMax && <TableCell align="right">Max</TableCell>}
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredItems.map((item, i) => (
              <TableRow
                key={item.uuid ?? i}
                hover
                selected={item.uuid === selected}
                sx={{ cursor: "pointer" }}
                onClick={() => setSelected(item.uuid)}
              >
                {showMove && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {item.uuid === selected && (
                      <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <IconButton size="small" onClick={() => moveRow(item.uuid, "up")}>
                          <ArrowUpwardIcon fontSize="inherit" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => moveRow(item.uuid, "down")}
                        >
                          <ArrowDownwardIcon fontSize="inherit" />
                        </IconButton>
                      </Box>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <img
                    alt={`image of ${item.name}`}
                    className="image-list"
                    style={{ width: 32, height: 32, objectFit: "contain" }}
                    src={getIcon(item.geometry?.toString() ?? "")}
                  />
                </TableCell>
                {showType && <TableCell>{getTypeFromUuid(item.uuid)}</TableCell>}
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.description}</TableCell>
                {showUiComponent && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <UiComponentCell
                      row={item}
                      onChange={(v) => setUiComponent(item, v)}
                    />
                  </TableCell>
                )}
                {showMinMax && (
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <MinMaxCell item={item} field="min" validate={validateMinMax} />
                  </TableCell>
                )}
                {showMinMax && (
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <MinMaxCell item={item} field="max" validate={validateMinMax} />
                  </TableCell>
                )}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <IconButton size="small" onClick={() => removeObject(item.uuid)}>
                    <DeleteIcon fontSize="inherit" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
