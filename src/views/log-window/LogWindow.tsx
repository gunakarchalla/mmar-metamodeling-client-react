import { memo, useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Icon,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import { useLogStore, type LogEntry } from "@/resources/store/logStore";

// Hoisted: `sx` object literals are new values on every render, which defeats
// emotion's cache — and these two are rendered once per log line.
const ROW_SX = {
  alignContent: "center",
  fontSize: "8pt",
  borderTop: "solid 1pt rgb(128,128,128)",
  px: 0.5,
  py: 0.25,
} as const;
const STATUS_ICON_SX = { fontSize: "12pt", verticalAlign: "middle", mr: 0.5 } as const;

/**
 * One log line, memoised so that appending a line re-renders only the new one
 * rather than every line already on screen. Entries are immutable once created,
 * so the default shallow prop comparison never gives a stale row.
 */
const LogRow = memo(function LogRow({ entry, time }: { entry: LogEntry; time: string }) {
  return (
    <Tooltip title={entry.value} placement="left">
      <Box sx={ROW_SX}>
        {time}:
        <br />
        <Icon sx={STATUS_ICON_SX}>{entry.status}</Icon>
        <span>{entry.value}</span>
      </Box>
    </Tooltip>
  );
});

function LogEntries() {
  const logArray = useLogStore((s) => s.logArray);
  const time = new Date().toDateString();
  return (
    <>
      {logArray.map((entry) => (
        <LogRow key={entry.id} entry={entry} time={time} />
      ))}
    </>
  );
}

/**
 * The log panel: everything the app has reported this session, newest first,
 * with a button that opens the same list in a larger dialog. The panel is kept
 * scrolled to the top so a new entry is visible the moment it arrives.
 */
export default function LogWindow() {
  const [open, setOpen] = useState(false);
  const logArray = useLogStore((s) => s.logArray);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [logArray.length]);

  return (
    <Box
      sx={{
        height: "100%",
        overflowY: "auto",
        overscrollBehavior: "contain",
        p: 1,
      }}
      ref={scrollRef}
    >
      <Typography variant="h6" sx={{ m: 0, p: 0, display: "flex", alignItems: "center" }}>
        Log
        <IconButton size="small" onClick={() => setOpen(true)}>
          <OpenInFullIcon fontSize="small" />
        </IconButton>
      </Typography>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Log Window</DialogTitle>
        <DialogContent>
          <LogEntries />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} autoFocus>
            Ok
          </Button>
        </DialogActions>
      </Dialog>

      <LogEntries />
    </Box>
  );
}
