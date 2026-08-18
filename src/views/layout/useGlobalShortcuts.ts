import { useEffect } from "react";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { backendService } from "@/resources/services/backend-service";
import { hasCommandModifier } from "@/resources/util/platform";

/**
 * The application-wide keyboard shortcuts: save, undo and redo.
 *
 * They are bound on `window` so they work wherever focus happens to be. The one
 * exception is the code editor, which resolves undo and redo itself (it has to:
 * Monaco stops propagation for keys it handles) and binds them to the very same
 * store actions — so events coming from inside it are skipped here rather than
 * being counted twice.
 */
export function useGlobalShortcuts(): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!hasCommandModifier(event) || event.altKey) return;
      // Shift uppercases the key, so compare in lower case throughout.
      const key = event.key.toLowerCase();

      if (key === "s") {
        event.preventDefault();
        void backendService.saveSelectedObject();
        return;
      }

      if (key !== "z" && key !== "y") return;
      if ((event.target as HTMLElement | null)?.closest?.(".monaco-editor")) return;
      event.preventDefault();

      const store = useSelectedObjectStore.getState();
      if (key === "y" || event.shiftKey) store.redo();
      else store.undo();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
