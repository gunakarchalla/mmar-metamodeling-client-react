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

// Replaces signin-signup-window. Sign In / Sign Up against authStore.
// On successful login it triggers the global refresh (replacing the original
// eventAggregator.publish("refresh", ...)).
export default function SignInSignUpDialog({ open, onClose }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const login = useAuthStore((s) => s.login);
  const signup = useAuthStore((s) => s.signup);
  const setCurrentUser = useAuthStore((s) => s.setCurrentUser);
  const log = useLogStore((s) => s.log);
  const triggerRefresh = useUiStore((s) => s.triggerRefresh);

  async function handleSignIn() {
    if (!username || !password) {
      log("Please enter username and password", "error");
      return;
    }
    const success = await login(username, password);
    if (success) {
      triggerRefresh("Refresh button");
      onClose();
    } else {
      log("Wrong username or password", "error");
    }
  }

  async function handleSignUp() {
    const success = await signup(username, password);
    if (success) {
      setCurrentUser();
      triggerRefresh("Refresh button");
      onClose();
    } else {
      log("Sign up failed", "error");
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Sign In</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSignIn();
            }}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={handleSignUp}>
          Sign Up
        </Button>
        <Button variant="outlined" onClick={handleSignIn}>
          Sign In
        </Button>
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
