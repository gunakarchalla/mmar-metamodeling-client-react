import { Box, useTheme } from "@mui/material";
import Editor from "@monaco-editor/react";
// Side-effect import: self-host Monaco + wire its workers under Vite (must run
// before the first <Editor/> mounts). See monaco-setup.ts.
import "@/views/code-editor/monaco-setup";

// A plain, reusable Monaco editor bound to a controlled string value — the
// code-editing counterpart of `BoundText` in the general tab's fields.tsx.
//
// Deliberately free of the editorStore / event-bus handshakes that
// `CodeEditor` carries: that one exists to drive the VizRep geometry preview
// pipeline, whereas this is just "a textarea, but with syntax highlighting".
// The host owns the value and decides where a change is committed.
//
// The wrapper box is `resize: vertical` (as in VizRepGeometryEditor) so the
// user can drag it taller; Monaco's automaticLayout picks the new height up.
export default function BoundCodeEditor({
  value,
  onChange,
  language = "javascript",
  height = 300,
}: {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: number;
}) {
  // Follow the app's MUI palette rather than pinning a Monaco theme, so the
  // editor never sits dark inside a light app (or vice versa).
  const monacoTheme = useTheme().palette.mode === "dark" ? "vs-dark" : "vs";

  return (
    <Box
      sx={{
        height,
        minHeight: 120,
        resize: "vertical",
        overflow: "hidden",
        // Keeps the browser's resize grabber (bottom-right corner) clear of
        // Monaco's absolutely-positioned layers, which would otherwise swallow
        // the pointer. The editor fills the content box above the padding.
        pb: "14px",
        boxSizing: "border-box",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
      }}
    >
      <Editor
        language={language}
        theme={monacoTheme}
        value={value}
        onChange={(v) => onChange(v ?? "")}
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
