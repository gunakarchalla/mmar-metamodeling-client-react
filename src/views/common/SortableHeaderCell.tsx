import { TableCell } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { SortState } from "./object-table";

/** A clickable column header showing the sort arrow when it is the active one. */
export default function SortableHeaderCell({
  column,
  label,
  sort,
  sortBy,
  enabled = true,
  align,
}: {
  column: string;
  label: string;
  sort: SortState;
  sortBy: (column: string) => void;
  enabled?: boolean;
  align?: "left" | "right";
}) {
  const active = enabled && sort.column === column;
  const Arrow = sort.direction === "asc" ? ArrowUpwardIcon : ArrowDownwardIcon;

  return (
    <TableCell
      align={align}
      sx={{ cursor: enabled ? "pointer" : "default" }}
      onClick={enabled ? () => sortBy(column) : undefined}
    >
      {label}
      {active && (
        <Arrow fontSize="inherit" sx={{ ml: 0.5, verticalAlign: "middle" }} />
      )}
    </TableCell>
  );
}
