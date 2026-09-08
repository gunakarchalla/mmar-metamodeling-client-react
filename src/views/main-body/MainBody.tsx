import { useEffect, useState } from "react";
import { Box, Icon, Typography, CircularProgress } from "@mui/material";
import { styled } from "@mui/material/styles";
import { Group, Panel, Separator, useDefaultLayout } from "react-resizable-panels";
import { backendService } from "@/resources/services/backend-service";
import LogWindow from "@/views/log-window/LogWindow";
import LeftNav from "@/views/left-nav/LeftNav";
import MiddleBody from "@/views/middle-body/MiddleBody";

/** The draggable divider between two panels; highlights on hover and drag. */
const ResizeHandle = styled(Separator)(({ theme }) => ({
  width: 5,
  flex: "0 0 auto",
  backgroundColor: theme.palette.divider,
  cursor: "col-resize",
  transition: theme.transitions.create("background-color"),
  "&:hover, &:active": {
    backgroundColor: theme.palette.primary.main,
  },
}));

/**
 * The three resizable columns the app works in — object lists, editor, log —
 * behind a check that the server is actually reachable. The column widths are
 * remembered across reloads.
 */
export default function MainBody() {
  const [isConnected, setIsConnected] = useState<boolean | undefined>(undefined);

  // Remembers the column widths across reloads. v4 removed `autoSaveId`; this hook
  // is its replacement and still persists to localStorage under the same id. It is
  // called above the early returns below so the hook order never changes.
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "mmar-metamodeling-layout",
  });

  // The reachability check starts immediately. It used to sit behind a one-second
  // `setTimeout`, which every page load spent on the "Connecting to the backend…"
  // spinner before the first request was even sent — and there was nothing to
  // wait for: `authStore` restores the stored session synchronously at import
  // time, so the token `ping` needs is in place before this component mounts.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await backendService.ping();
      if (!cancelled) setIsConnected(!!ok);
    })();
    return () => {
      cancelled = true;
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
    <Group
      orientation="horizontal"
      defaultLayout={defaultLayout}
      onLayoutChanged={onLayoutChanged}
      style={{ flex: 1, minHeight: 0 }}
    >
      {/* `overscrollBehavior: contain` stops a fast flick that reaches the end
          of a panel from chaining its leftover scroll into the document, which
          the shell deliberately cannot scroll. Set on all three panels. */}
      <Panel
        id="left-nav"
        defaultSize="18"
        minSize="0"
        maxSize="35"
        style={{ overflowY: "auto", overscrollBehavior: "contain" }}
      >
        <LeftNav />
      </Panel>

      <ResizeHandle />

      <Panel id="middle-body" minSize="30">
        <Box
          className="middle-body"
          sx={{
            height: "100%",
            overflowY: "auto",
            overscrollBehavior: "contain",
            p: 1,
          }}
        >
          <MiddleBody />
        </Box>
      </Panel>

      <ResizeHandle />

      <Panel id="log-window" defaultSize="20" minSize="0" maxSize="40">
        <LogWindow />
      </Panel>
    </Group>
  );
}
