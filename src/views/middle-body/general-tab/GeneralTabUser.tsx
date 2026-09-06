import { useState } from "react";
import { Button, Stack, TextField } from "@mui/material";
import FieldsetSection from "@/views/common/FieldsetSection";
import { UUID } from "@gds/models/meta/Metamodel_metaobjects.structure";
import { backendService } from "@/resources/services/backend-service";
import { BoundText } from "./fields";
import { useSelectedObjectForm } from "./useSelectedObjectForm";

/**
 * Type a password and set it on one user.
 *
 * The typed password is component state rather than a bound field. Everything
 * else on this tab is written into the selected-object store, which is what Save
 * PATCHes to the server in full; a password held there would ride along on every
 * unrelated save, sit in the tab's undo history, and be ignored by the server,
 * which accepts one only through its own endpoint. Here it lives exactly as long
 * as the field is filled in.
 *
 * Keyed on the user's uuid by its caller, so that selecting another user
 * remounts it and a half-typed password cannot be submitted against the wrong
 * account.
 */
function UserPasswordField({ uuid }: { uuid: UUID }) {
  const [password, setPassword] = useState("");
  const [setting, setSetting] = useState(false);

  async function handleSet() {
    setSetting(true);
    try {
      // The outcome is reported in the log window, as for every other call, so
      // all that remains here is to stop displaying a password once it has been
      // accepted.
      if (await backendService.setUserPassword(uuid, password)) setPassword("");
    } finally {
      setSetting(false);
    }
  }

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
      <TextField
        label="Password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && password && !setting) void handleSet();
        }}
        autoComplete="new-password"
        fullWidth
        size="small"
      />
      <Button
        variant="outlined"
        // Nothing to set while the field is empty, and a second press while the
        // first is in flight would hash the same password again.
        disabled={!password || setting}
        onClick={() => void handleSet()}
      >
        Set
      </Button>
    </Stack>
  );
}

/** User-only fields: the login name, and setting the password. */
export default function GeneralTabUser() {
  const { object, update } = useSelectedObjectForm();
  if (!object) return null;

  return (
    <FieldsetSection legend="User">
      <Stack spacing={2}>
        <BoundText label="Username" path="username" obj={object} update={update} />
        {object.uuid && <UserPasswordField key={object.uuid} uuid={object.uuid} />}
      </Stack>
    </FieldsetSection>
  );
}
