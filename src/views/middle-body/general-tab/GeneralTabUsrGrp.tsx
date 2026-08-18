import { FormControlLabel, Switch, Stack } from "@mui/material";
import FieldsetSection from "@/views/common/FieldsetSection";
import { useSelectedObjectForm } from "./useSelectedObjectForm";

/** Which kinds of meta object members of this user group are allowed to create. */
const CREATION_RIGHTS = [
  { path: "can_create_scenetype", label: "can create scenetypes" },
  { path: "can_create_attribute", label: "can create attributes" },
  { path: "can_create_attribute_type", label: "can create attribute type" },
  { path: "can_create_class", label: "can create class" },
  { path: "can_create_relationclass", label: "can create relationclass" },
  { path: "can_create_port", label: "can create port" },
  { path: "can_create_role", label: "can create role" },
];

export default function GeneralTabUsrGrp() {
  const { object, update } = useSelectedObjectForm();
  if (!object) return null;
  const rights = object as unknown as Record<string, boolean>;

  return (
    <FieldsetSection legend="User group">
      <Stack>
        {CREATION_RIGHTS.map((right) => (
          <FormControlLabel
            key={right.path}
            control={
              <Switch
                checked={!!rights[right.path]}
                onChange={(event) => update(right.path, event.target.checked)}
              />
            }
            label={right.label}
          />
        ))}
      </Stack>
    </FieldsetSection>
  );
}
