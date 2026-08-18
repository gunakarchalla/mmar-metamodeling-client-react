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
import { ColumnStructure } from "@gds/models/meta/Metamodel_columns.structure";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { useLogStore } from "@/resources/store/logStore";
import { vizRepIcon } from "@/resources/services/vizrep-icon";
import { textify } from "@/resources/util/textify";
import { ObjectRow, useObjectTable } from "./object-table";
import SortableHeaderCell from "./SortableHeaderCell";
import ModalObjectSelect from "./ModalObjectSelect";

/**
 * The table of children hanging off the object being edited, with the controls
 * to add, remove, open and reorder them.
 *
 * `items` is the live array on the selected object, mutated in place by the
 * store, so this subscribes to the store's `revision` counter rather than
 * relying on the array reference changing.
 */

/** Child types that are references held by a role rather than objects. */
const ROLE_CHILD_TYPES = ["Source", "Destination", "Role"];

/** Child types that are bare uuid lists on a user group. */
const RIGHT_CHILD_TYPES = ["read_right", "write_right", "delete_right", "can_create_instance"];

/**
 * Inline cardinality editor for one end of a reference. Controlled by the live
 * reference value and persisted on every change.
 */
function MinMaxCell({
  item,
  field,
  onCommit,
}: {
  item: ObjectRow;
  field: "min" | "max";
  onCommit: (uuid: string, min: number, max: number) => void;
}) {
  return (
    <TextField
      type="number"
      size="small"
      label={field === "min" ? "Min" : "Max"}
      value={item[field] ?? 0}
      inputProps={{ min: field === "min" ? 0 : (item.min ?? 0), step: 1 }}
      onChange={(event) => {
        const value = event.target.value === "" ? 0 : Number(event.target.value);
        onCommit(
          item.uuid,
          field === "min" ? value : Number(item.min ?? 0),
          field === "max" ? value : Number(item.max ?? 0),
        );
      }}
      sx={{ width: 90 }}
    />
  );
}

/**
 * Which input the modelling client should render for an attribute's value.
 *
 * The choice depends on whether the attribute defines facets — a `|`-separated
 * list of allowed values. With facets the value comes from a fixed set, so only
 * a dropdown or a slider makes sense; without them it is free text, so only a
 * text field or a button does. The other options stay visible but disabled.
 */
function UiComponentCell({
  row,
  onChange,
}: {
  row: ObjectRow;
  onChange: (value: string) => void;
}) {
  const hasFacets = !!row.facets && row.facets.split("|").length > 0;
  return (
    <Select
      size="small"
      displayEmpty
      value={textify(row.ui_component)}
      onChange={(event) => onChange(event.target.value)}
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
  childType = "object",
  items,
  sortable = false,
}: {
  /** What `addChild`/`removeChild` should make of a uuid in this list. */
  childType?: string;
  items: ObjectRow;
  sortable?: boolean;
}) {
  // Children are mutated in place, so the store's commit counter — not the
  // `items` reference — is what signals that this list has changed.
  const revision = useSelectedObjectStore((s) => s.revision);
  const getObjectsFromRole = useSelectedObjectStore((s) => s.getObjectsFromRole);
  const getObjectFromUuid = useSelectedObjectStore((s) => s.getObjectFromUuid);
  const getTypeFromUuid = useSelectedObjectStore((s) => s.getTypeFromUuid);
  const removeChild = useSelectedObjectStore((s) => s.removeChild);
  const setSelectedObject = useSelectedObjectStore((s) => s.setSelectedObject);
  const updateMinMax = useSelectedObjectStore((s) => s.updateMinMax);
  const commitSelected = useSelectedObjectStore((s) => s.commitSelected);
  const log = useLogStore((s) => s.log);

  const [selected, setSelected] = useState<string | null>(null);

  const isRoleList = ROLE_CHILD_TYPES.includes(childType);
  const isRightList = RIGHT_CHILD_TYPES.includes(childType);
  const title = childType === "Role" ? "Reference" : childType;

  // A role field holds one role object; every other field holds an array.
  const rawItems: ObjectRow[] = useMemo(
    () => (!items ? [] : Array.isArray(items) ? items : [items]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, revision],
  );

  /** The rows to display, resolved from whatever the field actually stores. */
  const rows: ObjectRow[] = useMemo(() => {
    // Roles store references; show the objects they point at.
    if (isRoleList) return rawItems.flatMap((role) => getObjectsFromRole(role));

    // Table columns are rebuilt so each row carries its position as `sequence`.
    if (childType === "Column") {
      return rawItems.map((column, index) => {
        column.sequence = index + 1;
        return new ColumnStructure({ ...column.attribute }, index + 1).get_attribute();
      });
    }

    // Rights store bare uuids; resolve each to the object it names.
    if (isRightList) {
      return rawItems.flatMap((item) => {
        const object = getObjectFromUuid(typeof item === "string" ? item : item.uuid);
        return object ? [{ ...object }] : [];
      });
    }

    // Otherwise the field already holds the child objects. Lists the user cannot
    // sort carry an explicit order instead.
    return sortable ? rawItems : [...rawItems].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawItems, childType, isRoleList, isRightList, sortable, revision]);

  const { searchTerm, setSearchTerm, sort, sortBy, visibleRows } = useObjectTable(
    rows,
    getTypeFromUuid,
    { sortable },
  );

  function remove(uuid: string | null = selected) {
    if (!uuid) return;
    removeChild(uuid, childType);
    setSelected(null);
  }

  /** Position of `uuid` in the underlying array, which reordering works on. */
  function indexOf(uuid: string): number {
    return childType === "Column"
      ? rawItems.findIndex((item) => item.attribute.uuid === uuid)
      : rawItems.findIndex((item) => item.uuid === uuid);
  }

  /**
   * Move a row one place up or down. Reorders the live array in place and
   * renumbers `sequence`, which is what the order is persisted as.
   */
  function moveRow(uuid: string, direction: "up" | "down") {
    const from = indexOf(uuid);
    const to = direction === "up" ? from - 1 : from + 1;
    if (from < 0 || to < 0 || to >= rawItems.length) return;

    rawItems.splice(to, 0, ...rawItems.splice(from, 1));
    rawItems.forEach((item, index) => {
      item.sequence = index + 1;
    });
    commitSelected();
  }

  function commitMinMax(uuid: string, min: number, max: number) {
    if (min > max) {
      log("Minimum value cannot be greater than maximum value", "error");
      return;
    }
    updateMinMax(uuid, min, max);
  }

  // Reordering is offered exactly where sorting is not: a list the user can sort
  // has no stable order of its own to drag rows around in.
  const showMove = !sortable;
  const showType = isRoleList;
  const showMinMax = isRoleList;
  const showUiComponent = childType === "Attribute" || childType === "Column";

  return (
    <Box
      component="fieldset"
      sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2, m: 1 }}
    >
      <Box component="legend" sx={{ px: 1, fontWeight: 500 }}>
        {title}s
      </Box>

      <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap", mb: 1 }}>
        <TextField
          label="search"
          size="small"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          inputProps={{ maxLength: 256 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        <ModalObjectSelect childType={childType} onClose={() => setSelected(null)} />

        <Button
          variant="outlined"
          size="small"
          startIcon={<RemoveIcon />}
          disabled={selected === null}
          onClick={() => remove()}
        >
          Remove selected
        </Button>

        <Button
          variant="outlined"
          size="small"
          startIcon={<EditIcon />}
          disabled={selected === null}
          onClick={() => selected && setSelectedObject(selected)}
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
                <SortableHeaderCell
                  column="type"
                  label="Type"
                  sort={sort}
                  sortBy={sortBy}
                  enabled={sortable}
                />
              )}
              <SortableHeaderCell
                column="name"
                label="Name"
                sort={sort}
                sortBy={sortBy}
                enabled={sortable}
              />
              <SortableHeaderCell
                column="description"
                label="Description"
                sort={sort}
                sortBy={sortBy}
                enabled={sortable}
              />
              {showUiComponent && <TableCell>UI Component</TableCell>}
              {showMinMax && <TableCell align="right">Min</TableCell>}
              {showMinMax && <TableCell align="right">Max</TableCell>}
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((item, index) => (
              <TableRow
                key={item.uuid ?? index}
                hover
                selected={item.uuid === selected}
                sx={{ cursor: "pointer" }}
                onClick={() => setSelected(item.uuid)}
              >
                {showMove && (
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    {item.uuid === selected && (
                      <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <IconButton
                          size="small"
                          aria-label="move up"
                          onClick={() => moveRow(item.uuid, "up")}
                        >
                          <ArrowUpwardIcon fontSize="inherit" />
                        </IconButton>
                        <IconButton
                          size="small"
                          aria-label="move down"
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
                    src={vizRepIcon(item.geometry?.toString() ?? "")}
                  />
                </TableCell>
                {showType && <TableCell>{getTypeFromUuid(item.uuid)}</TableCell>}
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.description}</TableCell>
                {showUiComponent && (
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <UiComponentCell
                      row={item}
                      onChange={(value) => {
                        item.ui_component = value;
                        commitSelected();
                      }}
                    />
                  </TableCell>
                )}
                {showMinMax && (
                  <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                    <MinMaxCell item={item} field="min" onCommit={commitMinMax} />
                  </TableCell>
                )}
                {showMinMax && (
                  <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                    <MinMaxCell item={item} field="max" onCommit={commitMinMax} />
                  </TableCell>
                )}
                <TableCell onClick={(event) => event.stopPropagation()}>
                  <IconButton
                    size="small"
                    aria-label={`remove ${item.name}`}
                    onClick={() => remove(item.uuid)}
                  >
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
