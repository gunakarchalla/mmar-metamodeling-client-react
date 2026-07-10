import { useEffect } from "react";
import { Box, Button } from "@mui/material";
import { eventBus } from "@/resources/services/event-bus";
import { runPreview } from "@/views/preview-buttons/preview-pipeline";
import { logger } from "@/resources/services/logger";
import { describeError } from "@/resources/util/describe-error";

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

  function preview() {
    eventBus.publish("previewButtonClicked");
  }

  return (
    <Box
      className="preview-buttons"
      sx={{ display: "flex", gap: 1, alignItems: "center", px: 1, height: "100%", minHeight: 44 }}
    >
      <Button variant="outlined" size="small" onClick={preview}>
        Preview
      </Button>
    </Box>
  );
}
