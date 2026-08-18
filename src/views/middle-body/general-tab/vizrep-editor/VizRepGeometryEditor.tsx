import { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import CodeEditor from "@/views/code-editor/CodeEditor";
import PreviewButtons from "@/views/preview-buttons/PreviewButtons";
import ThreeCanvas from "@/views/three-canvas/ThreeCanvas";
import { useEditorStore } from "@/resources/store/editorStore";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { eventBus } from "@/resources/services/event-bus";

/**
 * The VizRep editor: source at the top, the preview controls in the middle, and
 * the live 3D canvas below.
 *
 * Shown in the General tab for the types that are drawn in 3D; the rest edit
 * their geometry as plain text. Heights are fixed rather than proportional
 * because the whole block sits inside the General tab's own scroll container,
 * where percentages of the viewport collapse. The editor's bottom edge can be
 * dragged to make it taller.
 */
export default function VizRepGeometryEditor() {
  // Keyed on the selected object's uuid rather than the object itself, so this
  // fires on a selection change and not on every edit to the object.
  const selectedUuid = useSelectedObjectStore((s) => s.selectedObject?.uuid);

  useEffect(() => {
    const object = useSelectedObjectStore.getState().getSelectedObject();
    // `geometry` is typed as a function by the shared data structures but holds
    // the source as a string at runtime.
    useEditorStore.getState().setCode(object?.geometry?.toString() ?? "");
    // Beautify the buffer only, so selecting an object cannot mark it edited.
    eventBus.publish("changeCodeEditorCode");
    // Redraw the canvas for this object. The listener waits for the engine to
    // finish starting up, which is what makes the very first selection work even
    // though the canvas below is still mounting.
    //
    // Published rather than called directly: the preview pipeline pulls in the
    // engine, whose module scope builds a WebGL renderer, and this component is
    // rendered — and tested — where there is no WebGL context.
    eventBus.publish("previewSelectedObject");
  }, [selectedUuid]);

  return (
    <Box
      className="vizrep-geometry-editor"
      sx={{ width: "100%", display: "flex", flexDirection: "column" }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
        Geometry
      </Typography>
      <Box
        sx={{
          height: 300,
          minHeight: 120,
          resize: "vertical",
          overflow: "hidden",
          // Keeps the resize grabber in the bottom-right corner clear of the
          // editor's own absolutely-positioned layers, which would otherwise
          // swallow the pointer.
          pb: "14px",
          boxSizing: "border-box",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
        }}
      >
        <CodeEditor />
      </Box>
      <Box sx={{ height: 44 }}>
        <PreviewButtons />
      </Box>
      <Box sx={{ height: 400 }}>
        <ThreeCanvas />
      </Box>
    </Box>
  );
}
