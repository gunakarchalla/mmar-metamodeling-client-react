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

// The VS-Code-style strip of open objects above the middle body. Every object
// you click in the left nav opens (or focuses) a tab here; each tab keeps its
// own working copy, so unsaved edits survive switching between them.
//
// A tab with unsaved edits shows a filled circle where the close button is —
// and, like VS Code, the circle turns into the ✕ while you hover it. Closing a
// dirty tab asks first; dismissing that dialog leaves the tab open and untouched.

// `name` lives on every concrete SelectableObject but not on the union, and the
// store holds raw JSON rather than gds instances (see the guide's type-dispatch
// section) — so it is read the same way the rest of the app reads it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nameOf = (tab: OpenTab | null) => (tab?.object as any)?.name as string | undefined;

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
                    // The close affordance sits inside the Tab's label, so stop
                    // the click before the Tab turns it into a selection change.
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

      {/* Dismissing this dialog (Esc / backdrop) deliberately does nothing —
          the tab stays open with its changes intact. */}
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
