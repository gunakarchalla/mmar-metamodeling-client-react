import { create } from "zustand";

/**
 * `id` exists purely so the panel can key its rows by identity. Entries are
 * prepended, so keying by array index made every row's key shift by one on each
 * new line — React then treated the whole list as changed and re-rendered all of
 * it, which is the opposite of what a key is for.
 */
export type LogEntry = { id: number; value: string; status: string };

let nextLogId = 0;

export type SnackbarSeverity = "error" | "info" | "success" | "warning";

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
}

interface LogState {
  logArray: LogEntry[];
  snackbar: SnackbarState;
  /** Mirrors Logger.log: console.error + snackbar on error, prepends to logArray. */
  log: (value: string, status: string) => void;
  closeSnackbar: () => void;
}

/**
 * How many entries the log keeps, newest first.
 *
 * The array was previously unbounded, and the panel renders one MUI `Tooltip`
 * per entry — so a long session turned every single log call into a re-render of
 * a list that only ever grew, and the engine logs on a timer. Capping it makes
 * that cost constant. A few hundred lines is far more scrollback than the panel
 * is ever read for.
 */
const MAX_LOG_ENTRIES = 200;

export const useLogStore = create<LogState>((set) => ({
  logArray: [],
  snackbar: { open: false, message: "", severity: "info" },

  log: (value, status) => {
    if (status === "error") {
      console.error(value);
      set({ snackbar: { open: true, message: value, severity: "error" } });
    }
    // original Logger uses unshift -> newest first
    set((s) => ({
      logArray: [{ id: nextLogId++, value, status }, ...s.logArray].slice(0, MAX_LOG_ENTRIES),
    }));
  },

  closeSnackbar: () => set((s) => ({ snackbar: { ...s.snackbar, open: false } })),
}));
