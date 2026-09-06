import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import TopNavBar from "@/views/top-nav-bar/TopNavBar";
import Toolbar from "@/views/toolbar/Toolbar";
import AppFooter from "@/views/footer/AppFooter";
import MainBody from "@/views/main-body/MainBody";
import SignInDialog from "@/views/auth/SignInDialog";
import AppSnackbar from "@/views/common/AppSnackbar";
import { useAuthStore } from "@/resources/store/authStore";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { useGlobalShortcuts } from "./useGlobalShortcuts";

/**
 * The application shell: the top bar and toolbar, the body, the footer, and the
 * two cross-cutting overlays (the sign-in dialog and the snackbar).
 *
 * Everything below the top bar is gated behind being signed in, and the sign-in
 * dialog opens by itself while nobody is.
 */
export default function AppLayout() {
  const currentUser = useAuthStore((s) => s.currentUser);
  // Open from the start whenever nobody is signed in. `authStore` rehydrates
  // itself from the stored token at import time, so this initialiser already
  // sees a restored session.
  const [loginOpen, setLoginOpen] = useState(!currentUser);

  // ...and open again on every later sign-out. This subscribes to the store
  // rather than reacting to the rendered `currentUser`, because the store is
  // the external system the dialog is following: the previous state is what
  // tells a real sign-out apart from a render that was already signed out, and
  // an effect that writes state from a store callback is not the cascading
  // render that `react-hooks/set-state-in-effect` warns about.
  useEffect(
    () =>
      useAuthStore.subscribe((state, previous) => {
        if (!state.currentUser && previous.currentUser) setLoginOpen(true);
      }),
    [],
  );

  useGlobalShortcuts();

  // Warn before a real browser navigation — a reload, a closed tab, following a
  // link away — while any editor tab holds unsaved edits, since the store lives
  // only in memory. (The in-app Refresh button raises its own confirmation;
  // this covers the exits it cannot intercept.) Browsers show a fixed message
  // of their own and ignore any text supplied here, so setting `returnValue` to
  // anything non-empty is all that is needed.
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (useSelectedObjectStore.getState().hasUnsavedTabs()) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <TopNavBar onOpenLogin={() => setLoginOpen(true)} />

      {currentUser ? (
        <>
          {/* The action buttons live in their own row rather than in the top
              bar, so the page title still fits on a laptop screen. */}
          <Box
            sx={{
              height: 40,
              flex: "0 0 auto",
              backgroundColor: "#f5f5f5",
              borderBottom: "1px solid #bdbdbd",
            }}
          >
            <Toolbar />
          </Box>
          <MainBody />
        </>
      ) : (
        <Box sx={{ flex: 1 }} />
      )}

      <AppFooter />

      <SignInDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
      <AppSnackbar />
    </Box>
  );
}
