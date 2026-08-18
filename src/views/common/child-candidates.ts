import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { ObjectRow } from "./object-table";

/**
 * Which objects may be added to a given child list.
 *
 * Most lists accept objects of one type, named by the list itself. The rest
 * either accept anything (a role can reference any concept, a user-group right
 * can name any object) or accept a type other than their own name suggests.
 */
const CANDIDATE_TYPE: Readonly<Record<string, string>> = {
  Source: "All",
  Destination: "All",
  Role: "All",
  read_right: "All",
  write_right: "All",
  delete_right: "All",
  can_create_instance: "All",
  // A table row is a column *over* an attribute.
  Column: "Attribute",
  // A relation's bendpoint is drawn as a class.
  Bendpoint: "Class",
};

/** The meta type (or `"All"`) whose objects `childType` accepts. */
export function candidateTypeFor(childType: string): string {
  return CANDIDATE_TYPE[childType] ?? childType;
}

/**
 * A "Type" column is worth showing exactly when the candidates can be of more
 * than one type — otherwise every row would repeat the same word.
 */
export function showsTypeColumn(childType: string): boolean {
  return candidateTypeFor(childType) === "All";
}

/** The objects currently loaded that `childType` accepts. */
export function candidatesFor(childType: string): ObjectRow[] {
  return useSelectedObjectStore.getState().getObjects(candidateTypeFor(childType)) ?? [];
}
