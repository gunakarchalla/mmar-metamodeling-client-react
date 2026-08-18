import { Box, useTheme } from "@mui/material";
import Editor from "@monaco-editor/react";
// Side-effect import: self-hosts Monaco and wires its workers. Must run before
// the first editor mounts.
import "@/views/code-editor/monaco-setup";

/**
 * A code editor bound to a controlled string — the syntax-highlighted
 * counterpart of the General tab's bound text fields.
 *
 * Deliberately free of the preview handshakes `CodeEditor` carries: this is a
 * text area with highlighting, and the host decides what a change means. The
 * user can drag its bottom edge to make it taller.
 */
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
  // Follow the application's palette rather than pinning a theme.
  const monacoTheme = useTheme().palette.mode === "dark" ? "vs-dark" : "vs";

  return (
    <Box
      sx={{
        height,
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
