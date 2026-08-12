import "reflect-metadata";

import React from "react";
import ReactDOM from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import App from "./App";

// Palette tuned to the original styles/color_definition.scss
// ($primary #9ec8e1, $primary-light #BDD9EB, $secondary #ff8a65, $error #ff4747,
//  $enableGreen #4CAF50/#388E3C, $disableRed #F44336/#D32F2F).
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
    // The app is a fixed-viewport shell: AppLayout is 100vh tall and every
    // scrollable region (left nav, middle body, log window) scrolls inside
    // itself, so the *document* must never scroll. Nothing enforced that, so
    // anything sticking out past the viewport grew the document's scrollable
    // area and flashed an app-wide scrollbar. The usual culprit is a Tooltip:
    // it is portalled into <body>, and once Popper.js initialises it replaces
    // MUI's initial `position: fixed` with its default `absolute` strategy plus
    // a `transform` — and an absolutely positioned, transformed box does count
    // towards document overflow. Scrolling a list fast opens and repositions
    // those tooltips under the moving cursor, so the flash repeats for as long
    // as the flick lasts. Clipping at the document level ends it at the source.
    MuiCssBaseline: {
      styleOverrides: {
        "html, body, #root": { height: "100%" },
        "html, body": { overflow: "hidden" },
      },
    },
    // Tooltips with arrows mirror the MDC tooltip look used throughout the
    // original; buttons keep mixed-case labels (MUI defaults to UPPERCASE).
    // `preventOverflow.altAxis` keeps a tooltip inside the viewport on its
    // cross axis as well: Popper guards only the main axis by default, so the
    // `placement="left"`/`"right"` tooltips of the log entries and left-nav rows
    // used to hang past the top/bottom edge — which is what the document had to
    // grow to accommodate, and what would now be clipped instead. MUI appends
    // these modifiers to its own (arrow), and Popper merges same-named modifiers
    // into its defaults, so this only flips that one option.
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
    // All buttons render black regardless of variant/color. The per-variant
    // overrides win over MUI's internal color styles, so even buttons that
    // pass color="inherit"/"primary" end up black.
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
