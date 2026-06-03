import { create } from "zustand";

// Replaces the original Aurelia EventAggregator "refresh" channel.
// Components that need to reload data subscribe to `refreshNonce`; anything
// that previously called `eventAggregator.publish("refresh", ...)` calls
// `triggerRefresh()` instead.
//
// `refreshType` mirrors the original payload distinction handled by
// left-nav.ts `refresh(refreshType)`:
//   - "Refresh button" / login  -> full reload of every list (resetObjects).
//   - undefined (post-save/create) -> reload only the currently selected type,
//     preserving the current selection.
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
