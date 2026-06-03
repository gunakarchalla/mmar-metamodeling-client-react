import { TextField, Box, Stack } from "@mui/material";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { BoundText, CoordFieldset } from "./fields";
import GeneralTabClass from "./GeneralTabClass";
import GeneralTabAttribute from "./GeneralTabAttribute";
import GeneralTabAttrType from "./GeneralTabAttrType";
import GeneralTabUsrGrp from "./GeneralTabUsrGrp";
import GeneralTabRelationclass from "./GeneralTabRelationclass";
import GeneralTabUser from "./GeneralTabUser";
import GeneralTabProcedure from "./GeneralTabProcedure";
import GeneralTabFile from "./GeneralTabFile";

// Ports general-tab.{ts,html}. The shared base fields (uuid/name/description/
// geometry/coordinates/rotation) plus a conditional variant sub-component
// dispatched on selectedObjectService.type. All fields are controlled and
// two-way bound to selectedObject via the store's updateSelectedField.
export default function GeneralTab() {
  // Re-renders on every commit (selectedObject is reref'd in place).
  const obj = useSelectedObjectStore((s) => s.selectedObject);
  const type = useSelectedObjectStore((s) => s.type);
  const update = useSelectedObjectStore((s) => s.updateSelectedField);

  if (!obj) return null;

  return (
    <Box component="section" sx={{ mt: 1 }}>
      <Stack spacing={2}>
        {/* UUID (read-only) */}
        <TextField
          label="UUID"
          value={obj.uuid ?? ""}
          InputProps={{ readOnly: true }}
          inputProps={{ maxLength: 256 }}
          fullWidth
          size="small"
        />

        {/* Name */}
        <BoundText label="Name" path="name" obj={obj} update={update} maxLength={256} />

        {/* Description */}
        <BoundText
          label="Description"
          path="description"
          obj={obj}
          update={update}
          maxLength={256}
        />

        {/* Geometry */}
        <BoundText
          label="Geometry"
          path="geometry"
          obj={obj}
          update={update}
          multiline
          rows={3}
        />

        {/* 2D Coordinates */}
        <CoordFieldset legend="Coordinates 2D" base="coordinates_2d" obj={obj} update={update} />

        {/* Absolute 3D Coordinates */}
        <CoordFieldset
          legend="Absolute coordinates 3D"
          base="absolute_coordinate_3d"
          obj={obj}
          update={update}
        />

        {/* Relative 3D Coordinates */}
        <CoordFieldset
          legend="Relative Coordinates 3D"
          base="relative_coordinate_3d"
          obj={obj}
          update={update}
        />

        {/* Rotation */}
        <CoordFieldset legend="Rotation" base="rotation" obj={obj} update={update} />
      </Stack>

      {/* Type-specific variant sub-components */}
      {type === "Attribute" && <GeneralTabAttribute />}
      {type === "AttributeType" && <GeneralTabAttrType />}
      {type === "Class" && <GeneralTabClass />}
      {type === "UserGroup" && <GeneralTabUsrGrp />}
      {type === "RelationClass" && <GeneralTabRelationclass />}
      {type === "User" && <GeneralTabUser />}
      {type === "Procedure" && <GeneralTabProcedure />}
      {type === "File" && <GeneralTabFile />}
    </Box>
  );
}
