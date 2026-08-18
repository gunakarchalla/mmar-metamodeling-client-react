import { useState } from "react";
import {
  Box,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import RefreshIcon from "@mui/icons-material/Refresh";
import BugReportIcon from "@mui/icons-material/BugReport";
import SaveIcon from "@mui/icons-material/Save";
import { useAuthStore } from "@/resources/store/authStore";
import { useUiStore } from "@/resources/store/uiStore";
import {
  selectCanRedo,
  selectCanUndo,
  useSelectedObjectStore,
} from "@/resources/store/selectedObjectStore";
import { backendService } from "@/resources/services/backend-service";
import { isMacPlatform } from "@/resources/util/platform";

/**
 * The keyboard chords advertised in the tooltips. The buttons carry their own
 * bare `aria-label`s so their accessible names stay the same on every platform,
 * rather than being derived from these titles.
 */
const CHORDS = isMacPlatform()
  ? { undo: "⌘Z", redo: "⌘⇧Z", save: "⌘S" }
  : { undo: "Ctrl+Z", redo: "Ctrl+Shift+Z", save: "Ctrl+S" };

/** Thin separator between groups of toolbar buttons. */
function VDivider() {
  return <Box sx={{ borderLeft: "1px solid #bdbdbd", height: 24, mx: 0.5 }} />;
}

/**
 * The action bar below the menus: undo and redo, which step the *active tab's*
 * own history; refresh, which reloads everything from the server; save; and, for
 * administrators, a button that dumps the selected object to the console.
 */
export default function Toolbar() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const triggerRefresh = useUiStore((s) => s.triggerRefresh);

  // Boolean selectors, so the toolbar re-renders only when a step becomes
  // available or stops being so — not on every keystroke that records one.
  const canUndo = useSelectedObjectStore(selectCanUndo);
  const canRedo = useSelectedObjectStore(selectCanRedo);
  const undo = useSelectedObjectStore((s) => s.undo);
  const redo = useSelectedObjectStore((s) => s.redo);

  // A refresh refetches every collection and so discards every open tab, unsaved
  // edits included — hence the confirmation when any of them has some.
  const [confirmRefresh, setConfirmRefresh] = useState(false);

  function requestRefresh() {
    if (useSelectedObjectStore.getState().hasUnsavedTabs()) {
      setConfirmRefresh(true);
      return;
    }
    triggerRefresh("Refresh button");
  }

  function refreshDiscarding() {
    setConfirmRefresh(false);
    triggerRefresh("Refresh button");
  }

  async function handleSave() {
    await backendService.saveSelectedObject();
    triggerRefresh();
  }

  /** Administrator aid: dump the object being edited to the browser console. */
  function logSelectedObject() {
    console.log("Currently selected object:", useSelectedObjectStore.getState().selectedObject);
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", width: "100%", height: "100%", px: 1 }}>
      {/* The <span> wrappers keep the tooltips working while their buttons are
          disabled, since a disabled button fires no pointer events. */}
      <Tooltip title={`undo (${CHORDS.undo})`}>
        <span>
          <IconButton size="small" aria-label="undo" disabled={!canUndo} onClick={undo}>
            <UndoIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={`redo (${CHORDS.redo})`}>
        <span>
          <IconButton size="small" aria-label="redo" disabled={!canRedo} onClick={redo}>
            <RedoIcon />
          </IconButton>
        </span>
      </Tooltip>

      <VDivider />

      <Tooltip title="refresh">
        <IconButton size="small" onClick={requestRefresh}>
          <RefreshIcon />
        </IconButton>
      </Tooltip>
      {currentUser?.isAdmin && (
        <Tooltip title="debug">
          <IconButton size="small" onClick={logSelectedObject}>
            <BugReportIcon />
          </IconButton>
        </Tooltip>
      )}

      <VDivider />

      <Tooltip title={`save (${CHORDS.save})`}>
        <IconButton size="small" aria-label="save" onClick={handleSave}>
          <SaveIcon />
        </IconButton>
      </Tooltip>

      {/* Dismissing this leaves the open tabs and their edits untouched. */}
      <Dialog open={confirmRefresh} onClose={() => setConfirmRefresh(false)}>
        <DialogTitle>Discard unsaved changes?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Refreshing reloads everything from the server and closes all open
            tabs. Some tabs have unsaved changes that will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRefresh(false)}>Cancel</Button>
          <Button onClick={refreshDiscarding} color="error" variant="contained">
            Refresh and discard
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
