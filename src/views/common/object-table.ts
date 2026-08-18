import { useMemo, useState } from "react";

/**
 * The searching and sorting shared by the two object tables — the children of
 * the object being edited (`ParentChildSelect`) and the candidates offered when
 * adding one (`ModalObjectSelect`). Both list meta objects with the same
 * columns and the same expectations about what searching for a word does.
 */

/** Rows are meta objects in whatever shape their collection holds them. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ObjectRow = any;

export interface SortState {
  column: string;
  direction: "asc" | "desc";
}

/** Resolves a row's type name; the tables read it from the store. */
type TypeResolver = (uuid: string) => string | null;

/**
 * Does `row` match `term`?
 *
 * Matching covers the object's type as well as its name and description, so
 * searching for "SceneType" returns every scene type rather than only those
 * whose text happens to contain the word.
 */
function matches(row: ObjectRow, term: string, typeOf: TypeResolver): boolean {
  const needle = term.toLowerCase();
  return Boolean(
    row.name?.toLowerCase().includes(needle) ||
      row.description?.toLowerCase().includes(needle) ||
      typeOf(row.uuid)?.toLowerCase().includes(needle),
  );
}

function compareBy(column: string, direction: "asc" | "desc", typeOf: TypeResolver) {
  const valueOf = (row: ObjectRow) => (column === "type" ? typeOf(row.uuid) : row[column]);
  return (a: ObjectRow, b: ObjectRow) => {
    const [av, bv] = [valueOf(a), valueOf(b)];
    const result = av < bv ? -1 : av > bv ? 1 : 0;
    return direction === "asc" ? result : -result;
  };
}

/**
 * Sort/search state plus the rows that survive it.
 *
 * `sortable: false` leaves the caller's order intact (the table tab is ordered
 * by an explicit sequence the user drags around) while still allowing search.
 */
export function useObjectTable(
  rows: ObjectRow[],
  typeOf: TypeResolver,
  { sortable = true }: { sortable?: boolean } = {},
) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sort, setSort] = useState<SortState>({ column: "name", direction: "asc" });

  const visibleRows = useMemo(() => {
    const sorted = sortable
      ? [...rows].sort(compareBy(sort.column, sort.direction, typeOf))
      : rows;
    return searchTerm ? sorted.filter((row) => matches(row, searchTerm, typeOf)) : sorted;
  }, [rows, sortable, sort, searchTerm, typeOf]);

  /** Toggle direction when the same column is clicked again. */
  const sortBy = (column: string) =>
    setSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column, direction: "asc" },
    );

  return { searchTerm, setSearchTerm, sort, sortBy, visibleRows, sortable };
}
