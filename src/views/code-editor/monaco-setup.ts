// Monaco worker + loader wiring for Vite.
//
// DECISION (plan §317 — "decide CDN vs self-hosted and document"): we self-host
// Monaco from the locally installed `monaco-editor` package instead of letting
// @monaco-editor/react fetch it from a CDN. This keeps the app fully offline /
// Docker-friendly (the CDN default fails without internet). Vite's `?worker`
// imports bundle each language worker; `self.MonacoEnvironment.getWorker` hands
// the right one to Monaco, and `loader.config({ monaco })` tells
// @monaco-editor/react to use this bundled instance (so the same `monaco` object
// we call addExtraLib on is the one the <Editor/> mounts).
//
// Importing this module once (side-effect import in CodeEditor.tsx) performs the
// wiring. It must run before the first <Editor/> mounts.
import * as monaco from "monaco-editor";
import { loader } from "@monaco-editor/react";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

(self as unknown as { MonacoEnvironment: monaco.Environment }).MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    switch (label) {
      case "json":
        return new jsonWorker();
      case "css":
      case "scss":
      case "less":
        return new cssWorker();
      case "html":
      case "handlebars":
      case "razor":
        return new htmlWorker();
      case "typescript":
      case "javascript":
        return new tsWorker();
      default:
        return new editorWorker();
    }
  },
};

loader.config({ monaco });
