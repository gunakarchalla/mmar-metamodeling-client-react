import { deepClone } from "@/resources/util/clone";

/**
 * The undo/redo stack of a single editor tab.
 *
 * Undo is scoped to the tab you are looking at, so each open tab owns one of
 * these: a list of snapshots of its working copy, oldest first, plus a cursor
 * into that list. `entries[index]` is always what the tab currently shows.
 */
export interface TabHistory<T> {
  entries: T[];
  index: number;
  /**
   * Index of the snapshot that matches what was last persisted, or -1 once that
   * snapshot has fallen off the stack or been discarded by a new edit branch.
   * `index === savedIndex` is what "this tab has no unsaved changes" means.
   */
  savedIndex: number;
  /** Field path the newest entry was created by, used to merge keystrokes. */
  coalesceKey: string | null;
  coalesceAt: number;
}

/**
 * How many snapshots one tab keeps. Each is a full deep clone of the object,
 * children and geometry included, so this bounds memory rather than usability —
 * keystroke coalescing already keeps a long typing session to a few entries.
 */
const MAX_HISTORY_ENTRIES = 50;

/** Successive edits to the *same* field within this window become one undo step. */
const COALESCE_WINDOW_MS = 600;

/** A fresh history whose single entry is the object as it was opened. */
export function newHistory<T>(obj: T): TabHistory<T> {
  return {
    entries: [deepClone(obj)],
    index: 0,
    savedIndex: 0,
    coalesceKey: null,
    coalesceAt: 0,
  };
}

/**
 * Return a new history with `snapshot` recorded as the current state.
 *
 * `coalesceKey` is the edited field's path when the caller mutates at keystroke
 * rate; structural mutators pass nothing and so always get their own undo step.
 */
export function pushHistory<T>(
  history: TabHistory<T>,
  snapshot: T,
  coalesceKey?: string,
): TabHistory<T> {
  const now = Date.now();
  const atTip = history.index === history.entries.length - 1;

  // Merge a run of keystrokes in one field into a single undo step — otherwise
  // undoing a typed-in name would cost one press per character. Never merge onto
  // the saved snapshot: undo has to be able to land back on it.
  if (
    coalesceKey &&
    atTip &&
    history.index !== history.savedIndex &&
    history.coalesceKey === coalesceKey &&
    now - history.coalesceAt < COALESCE_WINDOW_MS
  ) {
    const entries = [...history.entries];
    entries[history.index] = snapshot;
    return { ...history, entries, coalesceAt: now };
  }

  // Editing after an undo drops the redo branch — and the saved state with it,
  // if that is where the branch was.
  const entries = [...history.entries.slice(0, history.index + 1), snapshot];
  let savedIndex = history.savedIndex > history.index ? -1 : history.savedIndex;
  let index = entries.length - 1;

  if (entries.length > MAX_HISTORY_ENTRIES) {
    const overflow = entries.length - MAX_HISTORY_ENTRIES;
    entries.splice(0, overflow);
    index -= overflow;
    savedIndex = savedIndex < overflow ? -1 : savedIndex - overflow;
  }
  return { entries, index, savedIndex, coalesceKey: coalesceKey ?? null, coalesceAt: now };
}
