import { useEffect } from "react";
import { Box, Button, FormControlLabel, Switch, Tooltip } from "@mui/material";
import { eventBus } from "@/resources/services/event-bus";
import { runPreview, previewSelectedObject } from "@/views/preview-buttons/preview-pipeline";
import { logger } from "@/resources/services/logger";
import { describeError } from "@/resources/util/describe-error";
import { useEditorStore } from "@/resources/store/editorStore";
import { engine } from "@/engine";

/**
 * The controls under the VizRep source: draw it, and switch the canvas between
 * 2D and 3D.
 *
 * Pressing Preview does not build anything directly. It asks the editor to flush
 * its buffer onto the object first; the rebuild is triggered by the signal the
 * editor sends once it has, so what gets drawn is always what was saved.
 */
export default function PreviewButtons() {
  const threeDimensional = useEditorStore((s) => s.threeDimensional);
  const setThreeDimensional = useEditorStore((s) => s.setThreeDimensional);

  // The editor has flushed its buffer: rebuild the scene.
  //
  // The bus calls listeners synchronously and discards what they return, so an
  // async listener's rejection has nowhere to go and would surface as an
  // unhandled rejection rather than a log entry. The pipeline already reports
  // the compile failures it can attribute; this catches everything below them —
  // a VizRep that throws while running, a missing instance, a WebGL error.
  useEffect(() => {
    const sub = eventBus.subscribe("updatedGeometryValue", () => {
      void runPreview().catch((err: unknown) => {
        logger.log(`Preview failed: ${describeError(err)}`, "error");
      });
    });
    return () => sub.dispose();
  }, []);

  // The selection changed: redraw for the new object. This reads the geometry
  // straight off the object, so — unlike the Preview button — it never writes the
  // beautified buffer back, and selecting cannot mark an object edited.
  useEffect(() => {
    const sub = eventBus.subscribe("previewSelectedObject", () => {
      void previewSelectedObject().catch((err: unknown) => {
        logger.log(`Preview failed: ${describeError(err)}`, "error");
      });
    });
    return () => sub.dispose();
  }, []);

  function preview() {
    eventBus.publish("previewButtonClicked");
  }

  // Swap between the perspective and orthographic cameras. The editor store is
  // the React-facing mirror of a flag the engine also keeps, so both are set.
  function toggleDimension(is3d: boolean) {
    setThreeDimensional(is3d);
    engine.setThreeDimensional(is3d);
  }

  return (
    <Box
      className="preview-buttons"
      sx={{ display: "flex", gap: 1, alignItems: "center", px: 1, height: "100%", minHeight: 44 }}
    >
      <Button variant="outlined" size="small" onClick={preview}>
        Preview
      </Button>

      <Tooltip title={threeDimensional ? "switch to 2D" : "switch to 3D"}>
        <FormControlLabel
          sx={{ ml: 1, mr: 0 }}
          label={threeDimensional ? "3D" : "2D"}
          slotProps={{ typography: { variant: "body2" } }}
          control={
            <Switch
              size="small"
              checked={threeDimensional}
              onChange={(e) => toggleDimension(e.target.checked)}
              inputProps={{ "aria-label": "toggle 2D / 3D preview" }}
            />
          }
        />
      </Tooltip>
    </Box>
  );
}
