import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import TopNavBar from "@/views/top-nav-bar/TopNavBar";
import Toolbar from "@/views/toolbar/Toolbar";
import AppFooter from "@/views/footer/AppFooter";
import MainBody from "@/views/main-body/MainBody";
import SignInSignUpDialog from "@/views/auth/SignInSignUpDialog";
import AppSnackbar from "@/views/common/AppSnackbar";
import { useAuthStore } from "@/resources/store/authStore";
import { backendService } from "@/resources/services/backend-service";

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

  // Ctrl+S -> save selected object (replaces toolbar-container keydown handler).
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "s") {
        event.preventDefault();
        backendService.saveSelectedObject();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
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
