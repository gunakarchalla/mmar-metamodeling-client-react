import { Suspense, lazy } from "react";
import { TextField, Box, Stack, CircularProgress } from "@mui/material";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { BoundText, CoordFieldset } from "./fields";
import GeneralTabClass from "./GeneralTabClass";
import GeneralTabAttribute from "./GeneralTabAttribute";
import GeneralTabAttrType from "./GeneralTabAttrType";
import GeneralTabUsrGrp from "./GeneralTabUsrGrp";
import GeneralTabRelationclass from "./GeneralTabRelationclass";
import GeneralTabUser from "./GeneralTabUser";
import GeneralTabFile from "./GeneralTabFile";

// Code-split boundary for the two heavy libraries. Monaco (~3 MB) and three.js
// reach the bundle through exactly these two subtrees and nowhere else:
//   VizRepGeometryEditor -> CodeEditor (monaco)
//                        -> PreviewButtons -> preview-pipeline -> @/engine (three)
//                        -> ThreeCanvas                        -> @/engine (three)
//   GeneralTabProcedure  -> BoundCodeEditor (monaco)
// Both are already rendered only for specific `type` values, so a static import
// meant every user paid the download and parse cost up front — before login, and
// even when they never open a Class/RelationClass/Port/Procedure. Splitting BOTH
// is required to move Monaco: leaving either one eager keeps it in the main
// chunk.
const VizRepGeometryEditor = lazy(() => import("./vizrep-editor/VizRepGeometryEditor"));
const GeneralTabProcedure = lazy(() => import("./GeneralTabProcedure"));

// Placeholder shown while a split chunk downloads. It reserves the height the
// real block occupies (VizRep = 300px editor + 44px buttons + 400px canvas) so
// the surrounding form does not jump when the chunk lands.
function ChunkFallback({ height }: { height: number }) {
  return (
    <Box
      sx={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <CircularProgress size={24} />
    </Box>
  );
}

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

        {/* Geometry — after Rotation, before the type-specific variants (D4).
            Full VizRep block (Monaco + Preview + canvas) only for
            Class / RelationClass / Port (D1); every other type keeps the plain
            geometry textarea, relocated here. */}
        {type === "Class" || type === "RelationClass" || type === "Port" ? (
          <Suspense fallback={<ChunkFallback height={744} />}>
            <VizRepGeometryEditor />
          </Suspense>
        ) : (
          <BoundText
            label="Geometry"
            path="geometry"
            obj={obj}
            update={update}
            multiline
            rows={3}
          />
        )}
      </Stack>

      {/* Type-specific variant sub-components */}
      {type === "Attribute" && <GeneralTabAttribute />}
      {type === "AttributeType" && <GeneralTabAttrType />}
      {type === "Class" && <GeneralTabClass />}
      {type === "UserGroup" && <GeneralTabUsrGrp />}
      {type === "RelationClass" && <GeneralTabRelationclass />}
      {type === "User" && <GeneralTabUser />}
      {type === "Procedure" && (
        <Suspense fallback={<ChunkFallback height={300} />}>
          <GeneralTabProcedure />
        </Suspense>
      )}
      {type === "File" && <GeneralTabFile />}
    </Box>
  );
}
