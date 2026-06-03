import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@gds": path.resolve(__dirname, "../mmar-global-data-structure"),
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.ts"],
  },
});
