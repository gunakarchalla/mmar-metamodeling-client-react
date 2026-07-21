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

// Tooltip suffixes advertising each button's keyboard chord. The `aria-label`s
// below stay bare ("undo", "save", …) so the accessible names don't drift with
// the platform — MUI would otherwise derive them from these titles.
const CHORDS = isMacPlatform()
  ? { undo: "⌘Z", redo: "⌘⇧Z", save: "⌘S" }
  : { undo: "Ctrl+Z", redo: "Ctrl+Shift+Z", save: "Ctrl+S" };

// Vertical divider matching the modeling client's toolbar (1px light-grey separator).
function VDivider() {
  return <Box sx={{ borderLeft: "1px solid #bdbdbd", height: 24, mx: 0.5 }} />;
}

// Second menu bar (toolbar-container parity), split out of TopNavBar so the page
// title stays visible on laptop screens. Undo/Redo step the *active tab's* own
// history, Refresh triggers the global refresh, the bug button (admin only) logs
// the selected object and Save persists it + refreshes.
export default function Toolbar() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const triggerRefresh = useUiStore((s) => s.triggerRefresh);

  // Boolean selectors: these re-render the toolbar only when a step becomes
  // (un)available, not on every keystroke that pushes a history entry.
  const canUndo = useSelectedObjectStore(selectCanUndo);
  const canRedo = useSelectedObjectStore(selectCanRedo);
  const undo = useSelectedObjectStore((s) => s.undo);
  const redo = useSelectedObjectStore((s) => s.redo);

  // A full refresh re-fetches every collection and so discards every open tab,
  // unsaved edits included. Confirm first when any tab is dirty; dismissing the
  // dialog (Esc / backdrop / Cancel) leaves everything as it was.
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

  function handleTest() {
    console.log(
      "Currently selected object : ",
      useSelectedObjectStore.getState().selectedObject,
    );
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", width: "100%", height: "100%", px: 1 }}>
      {/* The <span> wrappers keep the tooltips working while the buttons are
          disabled (a disabled button fires no pointer events), which is also why
          each button carries its own aria-label — MUI would otherwise hang the
          tooltip's accessible name on the span. */}
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
          <IconButton size="small" onClick={handleTest}>
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

      {/* Dismissing this dialog (Esc / backdrop / Cancel) does nothing — the
          open tabs and their unsaved edits are left untouched. */}
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
