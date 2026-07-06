import { useEffect } from "react";
import { Box } from "@mui/material";
import Editor, { type BeforeMount } from "@monaco-editor/react";
import beautify from "js-beautify";
// Side-effect import: self-host Monaco + wire its workers under Vite (must run
// before the first <Editor/> mounts).
import "@/views/code-editor/monaco-setup";
import { GC_INTELLISENSE } from "@/views/code-editor/gc-intellisense";
import { useEditorStore } from "@/resources/store/editorStore";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { eventBus } from "@/resources/services/event-bus";

// The `gc` IntelliSense extra-lib is global to Monaco's TS language service, so it
// only needs to be registered once for the lifetime of the page (Monaco is a
// singleton). Guard against re-registration across remounts / StrictMode.
let intelliSenseRegistered = false;

const beautifyOptions = {
  indent_size: 2,
  break_chained_methods: true,
};

// Ports `views/code-editor/code-editor.{ts,html}`. The Monaco editor bound to
// editorStore.codeEditorValue. Two bus handshakes from the original:
//   - changeCodeEditorCode: js-beautify the current code then set it (fired when a
//     new object's geometry is loaded into the editor on selection). Beautify
//     touches the buffer ONLY, never the selected object (decision D8).
//   - previewButtonClicked: flush the editor's current value onto the selected
//     object's geometry, then publish updatedGeometryValue (the preview pipeline
//     in PreviewButtons listens for that and rebuilds the 3D scene).
//
// Live commit (decision D2): onChange also writes the value onto
// selectedObject.geometry via updateSelectedField, so the top-bar Save / Ctrl+S
// always persists exactly what the editor shows (no "edited but not previewed →
// stale save" footgun).
export default function CodeEditor() {
  const codeEditorValue = useEditorStore((s) => s.codeEditorValue);

  const beforeMount: BeforeMount = (monaco) => {
    if (!intelliSenseRegistered) {
      monaco.languages.typescript.javascriptDefaults.addExtraLib(GC_INTELLISENSE);
      intelliSenseRegistered = true;
    }
  };

  // changeCodeEditorCode -> beautify the loaded geometry then write it back.
  useEffect(() => {
    const sub = eventBus.subscribe("changeCodeEditorCode", () => {
      const code = useEditorStore.getState().codeEditorValue || "";
      if (code) {
        const res = beautify.js(code, beautifyOptions);
        useEditorStore.getState().setCode(res);
      }
    });
    return () => sub.dispose();
  }, []);

  // previewButtonClicked -> setEditorValueToCurrentInstance(): copy the editor
  // value onto the selected object's geometry, then signal the preview pipeline.
  useEffect(() => {
    const sub = eventBus.subscribe("previewButtonClicked", () => {
      const object = useSelectedObjectStore.getState().getSelectedObject();
      if (object) {
        object.geometry = useEditorStore.getState().codeEditorValue as unknown as typeof object.geometry;
      }
      eventBus.publish("updatedGeometryValue");
    });
    return () => sub.dispose();
  }, []);

  return (
    <Box className="editor" sx={{ width: "100%", height: "100%" }}>
      <Editor
        language="javascript"
        theme="vs-dark"
        value={codeEditorValue}
        onChange={(value) => {
          const v = value ?? "";
          // Buffer + live commit (D2): keep the editor store and the selected
          // object's geometry in lockstep so Save/Ctrl+S persists the visible code.
          useEditorStore.getState().setCode(v);
          useSelectedObjectStore.getState().updateSelectedField("geometry", v);
        }}
        beforeMount={beforeMount}
        options={{
          minimap: { enabled: false },
          automaticLayout: true,
          fontSize: 13,
          scrollBeyondLastLine: false,
        }}
      />
    </Box>
  );
}
