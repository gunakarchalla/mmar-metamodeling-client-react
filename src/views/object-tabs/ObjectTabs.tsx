import { useState } from "react";
import {
  Box,
  Tabs,
  Tab,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CircleIcon from "@mui/icons-material/Circle";
import { useSelectedObjectStore, OpenTab } from "@/resources/store/selectedObjectStore";
import { useUiStore } from "@/resources/store/uiStore";
import { backendService } from "@/resources/services/backend-service";

/**
 * The strip of open objects above the editor.
 *
 * Clicking an object in the left navigation opens a tab here, or focuses the one
 * it is already open in. Each tab keeps its own working copy, so unsaved edits
 * survive switching between them — which is why closing a tab with edits asks
 * first, and why dismissing that question leaves the tab exactly as it was.
 *
 * A tab with unsaved edits shows a filled dot where its close button goes; the
 * dot turns back into the ✕ while the pointer is over it.
 */

const nameOf = (tab: OpenTab | null) => tab?.object?.name;

export default function ObjectTabs() {
  const openTabs = useSelectedObjectStore((s) => s.openTabs);
  const activeTabUuid = useSelectedObjectStore((s) => s.activeTabUuid);
  const activateTab = useSelectedObjectStore((s) => s.activateTab);
  const closeTab = useSelectedObjectStore((s) => s.closeTab);
  const triggerRefresh = useUiStore((s) => s.triggerRefresh);

  // The tab whose close was blocked by unsaved changes (null = no dialog).
  const [pendingClose, setPendingClose] = useState<OpenTab | null>(null);
  const [hoveredClose, setHoveredClose] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (openTabs.length === 0) return null;

  function requestClose(tab: OpenTab) {
    if (tab.dirty) {
      setPendingClose(tab);
      return;
    }
    closeTab(tab.uuid);
  }

  async function saveAndClose() {
    if (!pendingClose) return;
    setSaving(true);
    try {
      await backendService.saveObject(pendingClose.object, pendingClose.type);
      closeTab(pendingClose.uuid);
      setPendingClose(null);
      triggerRefresh();
    } finally {
      setSaving(false);
    }
  }

  function discardAndClose() {
    if (!pendingClose) return;
    closeTab(pendingClose.uuid);
    setPendingClose(null);
  }

  return (
    <>
      <Tabs
        className="object-tab-bar"
        value={activeTabUuid ?? false}
        onChange={(_e, value) => activateTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 36,
          borderBottom: "1px solid #bdbdbd",
          "& .MuiTab-root": { minHeight: 36, textTransform: "none", py: 0, pr: 1 },
        }}
      >
        {openTabs.map((tab) => (
          <Tab
            key={tab.uuid}
            className="object-tab"
            value={tab.uuid}
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box
                  component="span"
                  sx={{
                    maxWidth: 160,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontStyle: tab.dirty ? "italic" : "normal",
                  }}
                >
                  {nameOf(tab) || tab.type}
                </Box>
                <Tooltip
                  title={tab.dirty ? "Close (unsaved changes)" : "Close"}
                  arrow
                >
                  <Box
                    component="span"
                    role="button"
                    aria-label={`close ${nameOf(tab) ?? tab.uuid}`}
                    onMouseEnter={() => setHoveredClose(tab.uuid)}
                    onMouseLeave={() => setHoveredClose(null)}
                    // This sits inside the tab's own label, so the click has to
                    // be stopped before the tab reads it as "focus me".
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      requestClose(tab);
                    }}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      flex: "0 0 auto",
                      "&:hover": { backgroundColor: "action.hover" },
                    }}
                  >
                    {tab.dirty && hoveredClose !== tab.uuid ? (
                      <CircleIcon
                        className="unsaved-indicator"
                        sx={{ fontSize: 10, color: "warning.main" }}
                      />
                    ) : (
                      <CloseIcon sx={{ fontSize: 14 }} />
                    )}
                  </Box>
                </Tooltip>
              </Box>
            }
          />
        ))}
      </Tabs>

      {/* Dismissing this (Escape, or a click outside) deliberately does
          nothing: the tab stays open with its changes intact. */}
      <Dialog open={pendingClose !== null} onClose={() => setPendingClose(null)}>
        <DialogTitle>Unsaved changes</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Do you want to save the changes you made to “
            {nameOf(pendingClose) ?? "this object"}”?
            <br />
            Your changes will be lost if you don’t save them.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={discardAndClose} color="error" disabled={saving}>
            Discard changes
          </Button>
          <Button onClick={saveAndClose} variant="contained" disabled={saving}>
            Save changes
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
