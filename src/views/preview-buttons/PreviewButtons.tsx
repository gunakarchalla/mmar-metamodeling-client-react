import { useEffect } from "react";
import { Box, Button, FormControlLabel, Switch, Tooltip } from "@mui/material";
import { eventBus } from "@/resources/services/event-bus";
import { runPreview, previewSelectedObject } from "@/views/preview-buttons/preview-pipeline";
import { logger } from "@/resources/services/logger";
import { describeError } from "@/resources/util/describe-error";
import { useEditorStore } from "@/resources/store/editorStore";
import { engine } from "@/engine";

// Ports `views/preview-buttons/preview-buttons.{ts,html}`. The Save-to-DB button
// and its `save-selected` import are intentionally dropped (decision D3): the
// metamodeling client's single save path is the top-bar Save / Ctrl+S, which
// persists the live-committed geometry (D2). Only the Preview action remains:
//   Preview -> publishes previewButtonClicked. CodeEditor flushes the editor
//              value onto the selected object's geometry and publishes
//              updatedGeometryValue; the subscriber below then runs the build
//              pipeline (rebuild scene + instance + drawVizRep). This keeps the
//              original bus choreography (preview-buttons listened on
//              updatedGeometryValue) while doing a full, always-correct rebuild.
export default function PreviewButtons() {
  const threeDimensional = useEditorStore((s) => s.threeDimensional);
  const setThreeDimensional = useEditorStore((s) => s.setThreeDimensional);

  // updatedGeometryValue (published by CodeEditor after previewButtonClicked) ->
  // run the preview pipeline.
  useEffect(() => {
    // eventBus.publish() invokes listeners synchronously and discards whatever they
    // return, so an async listener's rejection has nowhere to go: it would surface as
    // an unhandled promise rejection rather than as a log entry. runPreview() already
    // catches the geometry-compile failures it can attribute (empty / invalid JS), so
    // this catch is the backstop for everything below it — a VizRep function that
    // throws while executing, a missing mock instance, WebGL errors.
    const sub = eventBus.subscribe("updatedGeometryValue", () => {
      void runPreview().catch((err: unknown) => {
        logger.log(`Preview failed: ${describeError(err)}`, "error");
      });
    });
    return () => sub.dispose();
  }, []);

  // previewSelectedObject (published by VizRepGeometryEditor when the selection
  // changes) -> redraw the canvas for the newly selected object. It waits for the
  // engine's init, so it also covers the very first selection, where the canvas is
  // still mounting. The pipeline reads the geometry straight off the selected object,
  // so — unlike the Preview button — this never writes the (beautified) editor buffer
  // back onto the object: selecting must not dirty it (D8).
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

  // Swap the preview between 3D (perspective camera) and 2D (orthographic).
  // editorStore is the React-facing mirror; engine.setThreeDimensional swaps the
  // camera + orbit controls and flags a re-render. Vizrep drives this from its
  // toolbar (a 3D/2D Button); the metamodeling client has no such toolbar, so it
  // sits next to Preview — the one control row this feature owns.
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
