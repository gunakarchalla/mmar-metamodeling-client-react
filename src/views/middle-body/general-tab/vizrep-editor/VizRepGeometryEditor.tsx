import { useEffect } from "react";
import { Box } from "@mui/material";
import CodeEditor from "@/views/code-editor/CodeEditor";
import PreviewButtons from "@/views/preview-buttons/PreviewButtons";
import ThreeCanvas from "@/views/three-canvas/ThreeCanvas";
import { useEditorStore } from "@/resources/store/editorStore";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { eventBus } from "@/resources/services/event-bus";

// New wrapper for the target (replaces vizrep's `views/middle-body/MiddleBody`).
// The VizRep editing core stacked top-to-bottom: Monaco code editor, the Preview
// button (Save-to-DB dropped, D3), then the live Three.js canvas. Rendered in the
// General tab only for Class / RelationClass / Port (decision D1); other types
// keep a plain geometry textarea (wired in GeneralTab, P4).
//
// D7: vizrep's percentage layout (40% / 5% / 55% of a full-height flex column)
// collapses inside the General tab's scroll container, so fixed pixel heights are
// used instead — editor 300px, buttons row 44px, canvas 400px. The child
// components fill their fixed-height container (height: 100%).
export default function VizRepGeometryEditor() {
  // Keyed on the selected object's uuid: on every selection change, load its
  // geometry into the editor buffer and beautify it (buffer only, D8). Reading
  // the uuid (not the whole object) keeps this from re-firing on unrelated
  // revision bumps.
  const selectedUuid = useSelectedObjectStore((s) => s.selectedObject?.uuid);

  useEffect(() => {
    const object = useSelectedObjectStore.getState().getSelectedObject();
    // geometry is typed `Function` on gds but holds a string at runtime (§4.4).
    useEditorStore.getState().setCode(object?.geometry?.toString() ?? "");
    // changeCodeEditorCode -> CodeEditor beautifies the buffer only (D8), so
    // selecting an object must not mark it changed.
    eventBus.publish("changeCodeEditorCode");
    // previewSelectedObject -> PreviewButtons redraws the canvas for this object
    // (waiting for the engine's init first, which is why the initial selection works
    // even though ThreeCanvas is still mounting below us). Without it the canvas kept
    // whatever the last Preview click had drawn.
    //
    // Published rather than called directly: the pipeline pulls in the engine, whose
    // module scope constructs a WebGLRenderer, and this wrapper is rendered (and
    // tested) in places that have no WebGL context.
    eventBus.publish("previewSelectedObject");
  }, [selectedUuid]);

  return (
    <Box
      className="vizrep-geometry-editor"
      sx={{ width: "100%", display: "flex", flexDirection: "column" }}
    >
      <Box sx={{ height: 300 }}>
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
