import { useEffect, useState } from "react";
import { Box, Icon, Typography, CircularProgress } from "@mui/material";
import { styled } from "@mui/material/styles";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { backendService } from "@/resources/services/backend-service";
import LogWindow from "@/views/log-window/LogWindow";
import LeftNav from "@/views/left-nav/LeftNav";
import MiddleBody from "@/views/middle-body/MiddleBody";

// A draggable divider styled as a thin MUI divider that highlights on
// hover/drag. Reused between every pair of panels. The library handles the
// drag mechanics and (via PanelGroup autoSaveId) persists the layout.
const ResizeHandle = styled(PanelResizeHandle)(({ theme }) => ({
  width: 5,
  flex: "0 0 auto",
  backgroundColor: theme.palette.divider,
  cursor: "col-resize",
  transition: theme.transitions.create("background-color"),
  '&:hover, &[data-resize-handle-state="drag"]': {
    backgroundColor: theme.palette.primary.main,
  },
}));

// Mirrors main-body-tab-bar: pings the server (after a short delay) and shows
// either the resizable 3-column content area or a "no connection" message.
// Columns (left-nav | middle-body | log window) are horizontally resizable;
// autoSaveId persists the layout to localStorage across reloads.
export default function MainBody() {
  const [isConnected, setIsConnected] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const ok = await backendService.ping();
      if (!cancelled) setIsConnected(!!ok);
    }, 1000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (isConnected === undefined) {
    return (
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <CircularProgress size={24} />
        <Typography>Connecting to the backend…</Typography>
      </Box>
    );
  }

  if (!isConnected) {
    return (
      <Box
        className="no-connection"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          color: "text.secondary",
        }}
      >
        <Icon sx={{ fontSize: 48 }}>cloud_off</Icon>
        <Typography>Oops! No connection to the backend</Typography>
      </Box>
    );
  }

  return (
    <PanelGroup
      direction="horizontal"
      autoSaveId="mmar-metamodeling-layout"
      style={{ flex: 1, minHeight: 0 }}
    >
      {/* Left-nav: object-category accordions */}
      <Panel defaultSize={18} minSize={12} maxSize={35} style={{ overflowY: "auto" }}>
        <LeftNav />
      </Panel>

      <ResizeHandle />

      {/* Middle-body: object tabs (General + structural/relational tabs) */}
      <Panel minSize={30}>
        <Box className="middle-body" sx={{ height: "100%", overflowY: "auto", p: 1 }}>
          <MiddleBody />
        </Box>
      </Panel>

      <ResizeHandle />

      {/* Log window */}
      <Panel defaultSize={20} minSize={12} maxSize={40}>
        <LogWindow />
      </Panel>
    </PanelGroup>
  );
}
