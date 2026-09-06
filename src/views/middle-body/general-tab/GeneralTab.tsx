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

/**
 * The fields every meta object has — identity, description, placement and
 * VizRep geometry — followed by the section specific to its type.
 */

/**
 * The two heavy libraries reach the bundle through exactly these two subtrees:
 *
 *   VizRepGeometryEditor → the code editor (Monaco) and the 3D canvas (three.js)
 *   GeneralTabProcedure  → the code editor (Monaco)
 *
 * Both are shown only for some types, so importing them eagerly made every user
 * pay the download and parse cost up front — before signing in, and even if they
 * never opened a class, port or procedure. Both have to be split for it to
 * work: leaving either one eager keeps Monaco in the main chunk.
 */
const VizRepGeometryEditor = lazy(() => import("./vizrep-editor/VizRepGeometryEditor"));
const GeneralTabProcedure = lazy(() => import("./GeneralTabProcedure"));

/** Types whose geometry is edited as a live 3D VizRep rather than as raw text. */
const VIZREP_TYPES = ["Class", "RelationClass", "Port"];

/** Height of the VizRep block: 300px editor + 44px buttons + 400px canvas. */
const VIZREP_HEIGHT = 744;
const PROCEDURE_HEIGHT = 300;

/**
 * Stands in while a lazily-loaded chunk downloads, reserving the height the real
 * block occupies so the surrounding form does not jump when it lands.
 */
function ChunkFallback({ height }: { height: number }) {
  return (
    <Box sx={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <CircularProgress size={24} />
    </Box>
  );
}

/** The section shown below the shared fields, chosen by the object's type. */
const TYPE_SECTIONS: Record<string, () => JSX.Element | null> = {
  Attribute: GeneralTabAttribute,
  AttributeType: GeneralTabAttrType,
  Class: GeneralTabClass,
  UserGroup: GeneralTabUsrGrp,
  RelationClass: GeneralTabRelationclass,
  User: GeneralTabUser,
  File: GeneralTabFile,
};

export default function GeneralTab() {
  // Re-renders on every commit: the selected object is republished in place.
  const object = useSelectedObjectStore((s) => s.selectedObject);
  const type = useSelectedObjectStore((s) => s.type);
  const update = useSelectedObjectStore((s) => s.updateSelectedField);

  if (!object) return null;

  const TypeSection = type ? TYPE_SECTIONS[type] : undefined;

  return (
    <Box component="section" sx={{ mt: 1 }}>
      <Stack spacing={2}>
        <TextField
          label="UUID"
          value={object.uuid ?? ""}
          slotProps={{
            input: { readOnly: true },
            htmlInput: { maxLength: 256 },
          }}
          fullWidth
          size="small"
        />

        <BoundText label="Name" path="name" obj={object} update={update} maxLength={256} />
        <BoundText
          label="Description"
          path="description"
          obj={object}
          update={update}
          maxLength={256}
        />

        <CoordFieldset
          legend="Coordinates 2D"
          base="coordinates_2d"
          obj={object}
          update={update}
        />
        <CoordFieldset
          legend="Absolute coordinates 3D"
          base="absolute_coordinate_3d"
          obj={object}
          update={update}
        />
        <CoordFieldset
          legend="Relative Coordinates 3D"
          base="relative_coordinate_3d"
          obj={object}
          update={update}
        />
        <CoordFieldset legend="Rotation" base="rotation" obj={object} update={update} />

        {/* Types that are drawn in 3D get the full VizRep block — code editor,
            preview button and live canvas. The rest edit the geometry as text. */}
        {type && VIZREP_TYPES.includes(type) ? (
          <Suspense fallback={<ChunkFallback height={VIZREP_HEIGHT} />}>
            <VizRepGeometryEditor />
          </Suspense>
        ) : (
          <BoundText
            label="Geometry"
            path="geometry"
            obj={object}
            update={update}
            multiline
            rows={3}
          />
        )}
      </Stack>

      {TypeSection && <TypeSection />}
      {type === "Procedure" && (
        <Suspense fallback={<ChunkFallback height={PROCEDURE_HEIGHT} />}>
          <GeneralTabProcedure />
        </Suspense>
      )}
    </Box>
  );
}
