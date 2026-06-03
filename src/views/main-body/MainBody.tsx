import { useEffect, useState } from "react";
import { Box, Icon, Typography, CircularProgress } from "@mui/material";
import { backendService } from "@/resources/services/backend-service";
import RightNav from "@/views/right-nav/RightNav";
import LogWindow from "@/views/log-window/LogWindow";
import LeftNav from "@/views/left-nav/LeftNav";
import MiddleBody from "@/views/middle-body/MiddleBody";

// Mirrors main-body-tab-bar: pings the server (after a short delay) and shows
// either the 3-column content area or a "no connection" message.
// LeftNav (Phase 4) and MiddleBody (Phase 5) are placeholders for now.
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
    <Box sx={{ flex: 1, display: "flex", minHeight: 0 }}>
      {/* Left-nav: object-category accordions */}
      <Box
        className="left-nav"
        sx={{
          flex: "0 0 260px",
          borderRight: "1px solid",
          borderColor: "divider",
          overflowY: "auto",
        }}
      >
        <LeftNav />
      </Box>

      {/* Middle-body: object tabs (General + structural/relational tabs) */}
      <Box className="middle-body" sx={{ flex: 1, overflowY: "auto", p: 1 }}>
        <MiddleBody />
      </Box>

      <RightNav />

      {/* Log window region */}
      <Box
        sx={{
          flex: "0 0 280px",
          borderLeft: "1px solid",
          borderColor: "divider",
          minHeight: 0,
        }}
      >
        <LogWindow />
      </Box>
    </Box>
  );
}
