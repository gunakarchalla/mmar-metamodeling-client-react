import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import TopNavBar from "@/views/top-nav-bar/TopNavBar";
import Toolbar from "@/views/toolbar/Toolbar";
import AppFooter from "@/views/footer/AppFooter";
import MainBody from "@/views/main-body/MainBody";
import SignInSignUpDialog from "@/views/auth/SignInSignUpDialog";
import AppSnackbar from "@/views/common/AppSnackbar";
import { useAuthStore } from "@/resources/store/authStore";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { backendService } from "@/resources/services/backend-service";
import { hasCommandModifier } from "@/resources/util/platform";

// Mirrors my-app.html: TopNavBar + main body + footer, plus the cross-cutting
// snackbar and the auth dialog. The body is gated behind authentication; the
// sign-in dialog auto-opens when no user is logged in.
export default function AppLayout() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const [loginOpen, setLoginOpen] = useState(false);

  // Auto-open the login dialog when not authenticated (signin-signup-window.attached).
  useEffect(() => {
    if (!currentUser) setLoginOpen(true);
  }, [currentUser]);

  // Ctrl+S / ⌘S -> save selected object (replaces toolbar-container keydown
  // handler). Monaco binds no Save chord of its own, so this keeps working while
  // the code editor has focus.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (hasCommandModifier(event) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        backendService.saveSelectedObject();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Undo/redo on the active tab: Ctrl+Z / ⌘Z to undo, Ctrl+Shift+Z / ⌘⇧Z and
  // Ctrl+Y / ⌘Y to redo. `key` is lower-cased because Shift uppercases it.
  // Events from inside Monaco are skipped only to rule out a double step: the
  // editor binds the same chords to the same store actions itself (CodeEditor's
  // `onMount`, which it must, since Monaco stops propagation on keys it
  // resolves). Both routes end in one undo of the active tab either way.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!hasCommandModifier(event) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key !== "z" && key !== "y") return;
      if ((event.target as HTMLElement | null)?.closest?.(".monaco-editor")) return;
      event.preventDefault();
      const store = useSelectedObjectStore.getState();
      if (key === "y" || event.shiftKey) store.redo();
      else store.undo();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Warn before a real browser navigation (reload / tab close / leaving the
  // page) when any open tab has unsaved edits. The store is memory-only, so such
  // a navigation drops every open tab. The in-app Refresh button has its own MUI
  // confirm; this covers the browser-level exits it cannot intercept. Browsers
  // show their own generic prompt and ignore any custom message, so `returnValue`
  // just needs to be set to a non-empty value to trigger it.
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
          {/* Toolbar row (mirrors the modeling client): the action buttons moved
              out of the top bar so the page title stays visible on laptops. */}
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

      <SignInSignUpDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
      <AppSnackbar />
    </Box>
  );
}
