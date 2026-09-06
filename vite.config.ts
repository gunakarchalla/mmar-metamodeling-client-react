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
    rolldownOptions: {
      output: {
        // Split the heavy vendors out of the app chunk so they cache
        // independently of application code (they change only on dependency
        // bumps, the app changes constantly).
        //
        // `three` and `monaco` are reachable only from the lazy VizRep/Procedure
        // subtrees (see GeneralTab.tsx), so the bundler would already keep them
        // out of the entry chunk; naming them here just pins them to stable,
        // separately cacheable files instead of letting them merge into
        // whichever lazy chunk pulls them in first.
        //
        // React, emotion and MUI are deliberately kept together in ONE chunk
        // rather than split further: emotion's cache and MUI's styled engine
        // initialise against React at module scope, and separating them into
        // sibling chunks makes the result sensitive to load order.
        //
        // P7 NOTE — this used to be `rollupOptions.output.manualChunks`. Vite 8
        // bundles with rolldown, which accepts that callback only through a
        // compatibility shim that it does NOT treat as authoritative: it still
        // re-homed `react`'s CommonJS module and the `\0vite/preload-helper.js`
        // virtual module into `monaco`, even though the callback returned
        // "vendor" for both. The entry then STATICALLY imported the 3.9 MB
        // monaco chunk (and index.html modulepreloaded it), which is the exact
        // regression the old comment here described. `codeSplitting.groups` is
        // rolldown's own API and IS authoritative, so the pins hold. Verified by
        // building both ways in the same tree: on vite 5 the entry preloaded
        // only `vendor`; on vite 8 with manualChunks it preloaded monaco too.
        codeSplitting: {
          groups: [
            {
              name: "three",
              test: /[\\/]node_modules[\\/](three|troika-[^\\/]+)[\\/]/,
              priority: 30,
              minSize: 0,
            },
            {
              name: "monaco",
              test: /[\\/]node_modules[\\/](monaco-editor|@monaco-editor)[\\/]/,
              priority: 20,
              minSize: 0,
            },
            {
              // Highest priority so react/emotion/MUI win over the two groups
              // above if anything ever matches both, and so the preload helper
              // lands here rather than in whichever chunk first calls it.
              name: "vendor",
              test: (id: string) =>
                /[\\/]node_modules[\\/](react|react-dom|scheduler|@emotion|@mui)[\\/]/.test(
                  id,
                ) || id.includes("vite/preload-helper"),
              priority: 40,
              minSize: 0,
            },
          ],
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
