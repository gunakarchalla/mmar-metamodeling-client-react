module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  ignorePatterns: ["dist", "node_modules", ".eslintrc.cjs"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react-hooks", "react-refresh"],
  rules: {
    ...require("eslint-plugin-react-hooks").configs.recommended.rules,
    "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    // The shared data structures type several fields loosely (geometry is a
    // `Function` holding a string, collections are unions of every meta type),
    // so the views index into objects that `any` describes best. Each such use
    // is opted into explicitly with a disable comment.
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
  },
  overrides: [
    {
      files: ["*.test.ts", "*.test.tsx"],
      env: { node: true },
    },
    {
      // These files are kept byte-identical with the sibling
      // `mmar-vizrep-client-react`, which shares the 3D engine and the services
      // built on it. Editing them here to satisfy a lint rule would fork the two
      // copies, so they are exempt; fix them in both clients at once instead.
      files: [
        "src/engine/**",
        "src/types/**",
        "src/stubs/**",
        "src/resources/services/api.ts",
        "src/resources/services/expression-utility.ts",
        "src/resources/services/instance-utility.ts",
        "src/resources/services/logger.ts",
        "src/resources/store/editorStore.ts",
        "src/resources/store/logStore.ts",
      ],
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unused-vars": "off",
      },
    },
  ],
};
