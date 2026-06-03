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
    // Tooltips with arrows mirror the MDC tooltip look used throughout the
    // original; buttons keep mixed-case labels (MUI defaults to UPPERCASE).
    MuiTooltip: { defaultProps: { arrow: true } },
    MuiButton: { styleOverrides: { root: { textTransform: "none" } } },
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
