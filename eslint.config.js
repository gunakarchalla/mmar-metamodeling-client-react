// Flat config for ESLint 10, which no longer reads `.eslintrc.*`.
//
// This is a 1:1 port of the `.eslintrc.cjs` it replaces: same parser, same rule
// surface, same two overrides. The one deliberate behaviour change is
// eslint-plugin-react-hooks 4 -> 7, whose `recommended` set grew from two rules
// to sixteen (the React Compiler rules were folded into this plugin). Those are
// adopted as recommended ships them rather than cherry-picked.
//
// `ignorePatterns` moved into the `ignores` block below - flat config reads
// neither `.eslintignore` nor `ignorePatterns`.
import js from "@eslint/js";
import globals from "globals";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  { ignores: ["dist", "node_modules"] },

  js.configs.recommended,
  // Supplies the @typescript-eslint plugin, its recommended rules, and the
  // `eslint-recommended` layer that switches off the core rules TypeScript
  // already covers (no-undef, core no-unused-vars, ...).
  ...tseslint.configs["flat/recommended"],
  reactHooks.configs.flat.recommended,

  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: "module",
      // The old `env: { browser: true, es2020: true }`. Documentation of intent
      // more than enforcement today: `eslint-recommended` turns `no-undef` off
      // for TypeScript files, so nothing currently reads this list.
      globals: { ...globals.browser },
    },
    plugins: { "react-refresh": reactRefresh },
    rules: {
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
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
  },

  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    languageOptions: { globals: { ...globals.node } },
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
    // The disable comments in these files target `no-unused-vars`, which is off
    // here but on in the sibling copy, so ESLint 10 - which reports unused
    // directives by default - would flag every one of them as pointless.
    linterOptions: { reportUnusedDisableDirectives: "off" },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      // New to `eslint:recommended` in ESLint 10. Every report in this repo is
      // inside this exempt set and is the same harmless shape: a `let` given a
      // placeholder value that the next statement overwrites unread.
      "no-useless-assignment": "off",
    },
  },
];
