import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.PORT ?? "8075"),
    host: true,
  },
  preview: {
    port: parseInt(process.env.PORT ?? "8075"),
    host: true,
  },
  resolve: {
    alias: {
      "@gds": path.resolve(__dirname, "../mmar-global-data-structure"),
      "@": path.resolve(__dirname, "src"),
      // The shared gds `User` DTO statically imports the Node-only
      // `jsonwebtoken` (for server-side jwt.sign). Stub it out so it never
      // reaches the browser bundle, where it crashes on Node's Buffer.
      jsonwebtoken: path.resolve(__dirname, "src/stubs/jsonwebtoken.ts"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split the heavy vendors out of the app chunk so they cache
        // independently of application code (they change only on dependency
        // bumps, the app changes constantly).
        //
        // `three` and `monaco` are reachable only from the lazy VizRep/Procedure
        // subtrees (see GeneralTab.tsx), so Rollup would already keep them out of
        // the entry chunk; naming them here just pins them to stable, separately
        // cacheable files instead of letting them merge into whichever lazy chunk
        // pulls them in first.
        //
        // React, emotion and MUI are deliberately kept together in ONE chunk
        // rather than split further: emotion's cache and MUI's styled engine
        // initialise against React at module scope, and separating them into
        // sibling chunks makes the result sensitive to load order.
        manualChunks(id: string) {
          // Vite's dynamic-import preload helper is a virtual module (not under
          // node_modules), so without this it falls through to Rollup's own
          // grouping — which parks it in whichever chunk it likes. It landed in
          // `monaco`, and because the entry calls the helper to load its lazy
          // chunks, the entry then STATICALLY imported all 3.9 MB of Monaco
          // (Vite even added a modulepreload for it), quietly undoing the split.
          // Pinning it next to React keeps it in a chunk the entry already needs.
          if (id.includes("vite/preload-helper")) return "vendor";
          if (!id.includes("node_modules")) return;
          if (id.includes("/three/") || id.includes("troika")) return "three";
          if (id.includes("monaco-editor") || id.includes("@monaco-editor/"))
            return "monaco";
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/scheduler/") ||
            id.includes("@emotion/") ||
            id.includes("@mui/")
          )
            return "vendor";
        },
      },
    },
  },
  optimizeDeps: {
    // Keep jsonwebtoken out of the esbuild dep pre-bundle, otherwise the
    // optimizer grabs the real (Node-only) package before resolve.alias can
    // redirect it. Excluded => the import flows through resolve.alias -> stub.
    exclude: ["jsonwebtoken"],
  },
});
