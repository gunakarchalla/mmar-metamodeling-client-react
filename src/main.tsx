import "reflect-metadata";

import React from "react";
import ReactDOM from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import App from "./App";

/**
 * The application theme: the MMAR palette, plus the handful of component
 * defaults the layout depends on.
 */
const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#9ec8e1", light: "#BDD9EB" },
    secondary: { main: "#ff8a65" },
    error: { main: "#ff4747" },
    success: { main: "#4CAF50", dark: "#388E3C" },
    background: { default: "#ffffff" },
  },
  components: {
    // The shell is exactly one viewport tall and every scrollable region — the
    // left navigation, the editor, the log — scrolls inside itself, so the
    // document itself must never scroll. Without this, anything sticking out
    // past the viewport grows the document and flashes an app-wide scrollbar.
    // Tooltips are the usual culprit: they are portalled into <body>, and once
    // positioned they switch to an absolute, transformed box, which does count
    // towards document overflow. Flicking through a long list opens and moves
    // those tooltips under the cursor, so the flash repeats for as long as the
    // flick lasts.
    MuiCssBaseline: {
      styleOverrides: {
        "html, body, #root": { height: "100%" },
        "html, body": { overflow: "hidden" },
      },
    },
    // `preventOverflow.altAxis` keeps a tooltip inside the viewport on its cross
    // axis too — only the main axis is guarded by default, so the left- and
    // right-placed tooltips of the log entries and navigation rows would hang
    // past the top or bottom edge and be clipped by the rule above.
    MuiTooltip: {
      defaultProps: {
        arrow: true,
        PopperProps: {
          popperOptions: {
            modifiers: [
              { name: "preventOverflow", options: { altAxis: true, padding: 8 } },
            ],
          },
        },
      },
    },
    // Buttons render black whatever variant or colour they ask for: these
    // per-variant overrides outrank MUI's own colour styles.
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none" },
        text: {
          color: "#000000",
          "&.Mui-disabled": { color: "rgba(0, 0, 0, 0.26)" },
        },
        outlined: {
          color: "#000000",
          borderColor: "#000000",
          "&:hover": {
            borderColor: "#000000",
            backgroundColor: "rgba(0, 0, 0, 0.04)",
          },
          "&.Mui-disabled": {
            color: "rgba(0, 0, 0, 0.26)",
            borderColor: "rgba(0, 0, 0, 0.12)",
          },
        },
        contained: {
          color: "#ffffff",
          backgroundColor: "#000000",
          "&:hover": { backgroundColor: "#1a1a1a" },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: "#000000",
          "&.Mui-disabled": { color: "rgba(0, 0, 0, 0.26)" },
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
