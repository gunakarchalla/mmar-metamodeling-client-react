# mmar-metamodeling-client-react

The MMAR **metamodel-design** tool: a single-page application for authoring the
metamodels that the MMAR modelling and AR clients then instantiate. Built with
**React + TypeScript + Vite + MUI + Zustand**, talking to `mmar-server`.

## What it does

Sign in, browse the eleven kinds of meta object the server holds, and edit them:
their own fields, the children they contain, the references between them, and —
for the concepts that are drawn in 3D — their **VizRep**, the JavaScript that
renders them, with a live preview.

## Architecture

There is no router. What you see is decided by a selection store and by a strip
of open editor tabs, VS Code style: each tab owns its own working copy of an
object, so unsaved edits survive switching between them and are only reconciled
with the loaded collections when the tab is saved.

- **`src/resources/meta-model/`** — `meta-types.ts`, the single source of truth
  for the eleven meta types: which store collection holds each one, which REST
  route it lives at, and how it is labelled. The store, the backend service and
  the left navigation are all derived from it.
- **`src/resources/store/`** — Zustand stores:
  - `selectedObjectStore` — the loaded metamodel, the selection, the open tabs
    and their per-tab undo history (`tab-history.ts`).
  - `authStore` — sign in/out, backed by the bearer token in local storage.
  - `logStore` — the log list plus the error snackbar.
  - `uiStore` — the refresh signal the left navigation listens on.
- **`src/resources/services/`** — the backend service and the framework-agnostic
  helpers built on it (file caching, metamodel lookups, VizRep icon extraction).
- **`src/views/`** — the UI, one folder per region: `layout/`, `top-nav-bar/`,
  `toolbar/`, `left-nav/`, `object-list/`, `object-tabs/`, `middle-body/` (the
  General tab and the structural tabs), `code-editor/`, `three-canvas/`,
  `preview-buttons/`, `log-window/`, `footer/`, `auth/`, and `common/` for the
  pieces shared between them.
- **`src/engine/`** — the Three.js engine that renders the VizRep preview.

### Code shared with the VizRep client

`src/engine/` (except `index.ts`), `api.ts`, `expression-utility.ts`,
`instance-utility.ts`, `logger.ts`, `editorStore.ts`, `logStore.ts`, `src/stubs/`
and `src/types/` are kept **byte-identical** with the sibling
`mmar-vizrep-client-react`. Change them in both clients together; the lint
configuration exempts them so a local fix cannot fork the two copies by accident.

## Shared data structures (`@gds`)

The DTOs in the sibling `../mmar-global-data-structure` are consumed unchanged
through the `@gds` path alias (configured in both `vite.config.ts` and
`tsconfig.json`) — not copied, not installed from npm. They are (de)serialised
with `class-transformer`, which is why `reflect-metadata` is the **first** import
of `src/main.tsx`.

Note that only scene types and scene instances are ever revived into their
classes; every other collection holds the raw JSON the server sent. Code that
needs to know what an object is therefore dispatches on the store's `type` tag,
never on `instanceof`.

## Configuration

Configuration comes from Vite environment variables, surfaced through
`src/config.ts`:

| Variable | Default | Meaning |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Base URL of `mmar-server` |

Set it in `.env` / `.env.development`. The browser runs on the host, so keep
`VITE_API_URL=http://localhost:8000` even under Docker: the `mmar_server`
service hostname does not resolve in the browser, and the port is host-mapped.

## Run / build

```bash
npm install
npm run dev        # Vite dev server on http://localhost:8075
npm run build      # tsc --noEmit && vite build
npm run preview    # serve the production build
npm run typecheck  # tsc --noEmit
npm run test       # vitest run
npm run lint       # eslint
```

The app needs **`mmar-server` on `:8000`** (`cd ../mmar-server && npm run debug`,
plus a reachable Postgres). Log in with the development credentials
(`admin` / `admin`).

Bundling splits `three`, `monaco-editor` and the React/MUI vendor code into
their own chunks, and the two subtrees that pull the first two in — the VizRep
editor and the procedure editor — are loaded lazily, so neither is downloaded
before you open an object that needs it.
