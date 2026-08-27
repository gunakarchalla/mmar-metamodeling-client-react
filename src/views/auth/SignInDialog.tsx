import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
} from "@mui/material";
import { useAuthStore } from "@/resources/store/authStore";
import { useLogStore } from "@/resources/store/logStore";
import { useUiStore } from "@/resources/store/uiStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Signing in, or changing the password of the account you are signing in to. */
type Mode = "signin" | "reset";

/**
 * Sign in, or reset your own password.
 *
 * Shown only while signed out — the top bar offers it only then, and the shell
 * opens it by itself. That is what shapes the reset flow: there is no session to
 * authorise the change, so the current password proves the account is yours, and
 * all three values are typed here.
 *
 * Accounts cannot be created from this dialog. Creating one requires an
 * administrator, and is done from the Users section by someone already signed in.
 */
export default function SignInDialog({ open, onClose }: Props) {
  const [mode, setMode] = useState<Mode>("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const login = useAuthStore((s) => s.login);
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const log = useLogStore((s) => s.log);
  const triggerRefresh = useUiStore((s) => s.triggerRefresh);

  /** Leave a mode without carrying a typed password across to the other one. */
  function switchTo(next: Mode) {
    setPassword("");
    setNewPassword("");
    setMode(next);
  }

  async function handleSignIn() {
    if (!username || !password) {
      log("Please enter username and password", "error");
      return;
    }
    setBusy(true);
    try {
      if (await login(username, password)) {
        triggerRefresh("Refresh button");
        onClose();
      } else {
        log("Wrong username or password", "error");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (!username || !password || !newPassword) {
      log("Please enter your username, current password and new password", "error");
      return;
    }
    setBusy(true);
    try {
      // A refusal is already reported by the store, so a failure needs nothing
      // added here. Success returns to signing in rather than opening a session,
      // so that the new password is what grants it.
      if (await resetPassword(username, password, newPassword)) {
        switchTo("signin");
      }
    } finally {
      setBusy(false);
    }
  }

  const submit = mode === "signin" ? handleSignIn : handleReset;
  const canSubmit =
    !busy && !!username && !!password && (mode === "signin" || !!newPassword);

  /** Enter submits, so the dialog can be used without reaching for the mouse. */
  const onEnter = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && canSubmit) void submit();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{mode === "signin" ? "Sign In" : "Reset Password"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={onEnter}
            fullWidth
          />
          <TextField
            label={mode === "signin" ? "Password" : "Current password"}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={onEnter}
            autoComplete={mode === "signin" ? "current-password" : "off"}
            fullWidth
          />
          {mode === "reset" && (
            <TextField
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onKeyDown={onEnter}
              autoComplete="new-password"
              fullWidth
            />
          )}
        </Stack>
      </DialogContent>
      {/* The button that switches mode sits on the left, apart from the two that
          act on what has been typed. `mr: auto` absorbs the free space, holding
          it in place as the mode changes the buttons beside it. */}
      <DialogActions>
        {mode === "signin" ? (
          <>
            <Button
              variant="outlined"
              disabled={busy}
              sx={{ mr: "auto" }}
              onClick={() => switchTo("reset")}
            >
              Reset Password
            </Button>
            <Button variant="outlined" disabled={!canSubmit} onClick={() => void handleSignIn()}>
              Sign In
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outlined"
              disabled={busy}
              sx={{ mr: "auto" }}
              onClick={() => switchTo("signin")}
            >
              Back
            </Button>
            <Button variant="outlined" disabled={!canSubmit} onClick={() => void handleReset()}>
              Reset
            </Button>
          </>
        )}
        <Button variant="outlined" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
