import { FormControlLabel, Switch, Stack } from "@mui/material";
import FieldsetSection from "@/views/common/FieldsetSection";
import { useSelectedObjectForm } from "./useSelectedObjectForm";

/** Class-only fields: whether instances may be reused, and whether it is abstract. */
export default function GeneralTabClass() {
  const { object, update } = useSelectedObjectForm();
  if (!object) return null;
  const flags = object as unknown as Record<string, boolean>;

  return (
    <FieldsetSection legend="Class">
      <Stack direction="row" spacing={2}>
        {[
          { path: "is_reusable", label: "Reusable" },
          { path: "is_abstract", label: "Abstract" },
        ].map((flag) => (
          <FormControlLabel
            key={flag.path}
            control={
              <Switch
                checked={!!flags[flag.path]}
                onChange={(event) => update(flag.path, event.target.checked)}
              />
            }
            label={flag.label}
          />
        ))}
      </Stack>
    </FieldsetSection>
  );
}
