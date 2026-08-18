import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";

/**
 * The two things every General-tab section needs: the object being edited and
 * the setter that writes one of its fields.
 *
 * The object is re-published on every commit, so reading it here is what makes
 * these sections re-render as the user types.
 */
export function useSelectedObjectForm() {
  const object = useSelectedObjectStore((s) => s.selectedObject);
  const update = useSelectedObjectStore((s) => s.updateSelectedField);
  return { object, update };
}
