import { useEffect } from "react";
import { Box, useTheme } from "@mui/material";
import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";
import beautify from "js-beautify";
// Side-effect import: self-hosts Monaco and wires its workers. Must run before
// the first editor mounts.
import "@/views/code-editor/monaco-setup";
import { GC_INTELLISENSE } from "@/views/code-editor/gc-intellisense";
import { useEditorStore } from "@/resources/store/editorStore";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { eventBus } from "@/resources/services/event-bus";

// The completion definitions are global to Monaco's language service, so they
// only need registering once per page — this guards against remounts.
let intelliSenseRegistered = false;

const beautifyOptions = {
  indent_size: 2,
  break_chained_methods: true,
};

/**
 * The VizRep source editor, with completions for the drawing API.
 *
 * Every keystroke is written straight onto the selected object's `geometry`, so
 * saving always persists exactly what is on screen — there is no way to edit the
 * code, skip the preview, and save something stale. It also means the editor is
 * just another bound field, and its undo behaves like every other field's.
 *
 * Two signals connect it to the preview:
 *
 *   - a newly loaded object's source arrives as `changeCodeEditorCode`, and is
 *     beautified. Beautifying rewrites the *buffer only*, never the object, so
 *     selecting an object cannot mark it edited.
 *   - pressing Preview arrives as `previewButtonClicked`; the current value is
 *     flushed onto the object and `updatedGeometryValue` asks the pipeline to
 *     rebuild the scene.
 */
export default function CodeEditor() {
  const codeEditorValue = useEditorStore((s) => s.codeEditorValue);
  // Follow the application's palette rather than pinning a theme, so the editor
  // never sits dark inside a light page or the other way round.
  const monacoTheme = useTheme().palette.mode === "dark" ? "vs-dark" : "vs";

  const beforeMount: BeforeMount = (monaco) => {
    if (!intelliSenseRegistered) {
      monaco.languages.typescript.javascriptDefaults.addExtraLib(GC_INTELLISENSE);
      intelliSenseRegistered = true;
    }
  };

  // Route undo and redo to the *tab's* history rather than the editor's own
  // buffer history, so geometry behaves like every other field: one step per run
  // of edits, and the tab counts as saved again when a step lands back on the
  // saved state. The built-in undo cannot do that — since every keystroke is
  // committed, reverting the buffer comes straight back through `onChange` as a
  // forward edit, leaving the tab permanently marked as edited even once the
  // code reads exactly as it was saved.
  //
  // This has to be bound on the editor itself: Monaco stops propagation for any
  // key it resolves, so a window-level listener never sees Ctrl+Z in here.
  const onMount: OnMount = (editor, monaco) => {
    const { CtrlCmd, Shift } = monaco.KeyMod;
    const undo = () => useSelectedObjectStore.getState().undo();
    const redo = () => useSelectedObjectStore.getState().redo();
    editor.addCommand(CtrlCmd | monaco.KeyCode.KeyZ, undo);
    editor.addCommand(CtrlCmd | Shift | monaco.KeyCode.KeyZ, redo);
    editor.addCommand(CtrlCmd | monaco.KeyCode.KeyY, redo);
  };

  // Newly loaded source: beautify the buffer, leaving the object untouched.
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

  // Preview pressed: flush the buffer onto the object, then ask for a rebuild.
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
        theme={monacoTheme}
        value={codeEditorValue}
        onChange={(value) => {
          // Keep the buffer and the object's geometry in lockstep, so saving
          // always persists the code that is on screen.
          const next = value ?? "";
          useEditorStore.getState().setCode(next);
          useSelectedObjectStore.getState().updateSelectedField("geometry", next);
        }}
        beforeMount={beforeMount}
        onMount={onMount}
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
