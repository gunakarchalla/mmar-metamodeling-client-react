import { create } from "zustand";

/**
 * The signal that tells the left navigation to reload from the server.
 *
 * `refreshNonce` is bumped on every request; subscribers watch it rather than a
 * boolean so two consecutive refreshes are two events. `refreshType` says how
 * much to reload:
 *
 *   - named ("Refresh button", signing in) — reload every list from scratch;
 *   - unnamed (after a save or a create)   — reload only the type being edited,
 *     leaving the rest of the tree and the current selection alone.
 */
interface UiState {
  refreshNonce: number;
  refreshType: string | undefined;
  triggerRefresh: (refreshType?: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  refreshNonce: 0,
  refreshType: undefined,
  triggerRefresh: (refreshType?: string) =>
    set((s) => ({ refreshNonce: s.refreshNonce + 1, refreshType })),
}));
