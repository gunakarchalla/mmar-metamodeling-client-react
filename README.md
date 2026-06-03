# mmar-metamodeling-client-react

A React port of the MMAR **metamodel-design** tool (`mmar-metamodeling-client`),
built for functional parity with the Aurelia 2 original. Same backend, same
shared DTOs, same workflows — re-implemented on **React + TypeScript + Vite +
MUI (Material UI) + Zustand**.

It is a single-page, **no-router** app: navigation is driven by a singleton
selection store (`selectedObjectStore`) plus a UI refresh signal (`uiStore`),
mirroring the original's `SelectedObjectService` + `EventAggregator`.

## Architecture

- **`src/resources/store/`** — Zustand stores ported from the Aurelia services:
  - `selectedObjectStore` — the in-memory metamodel tree + current selection
    (port of `SelectedObjectService`).
  - `authStore` — login/logout/signup, JWT in `localStorage["auth_token"]`
    (port of `UserService`).
  - `logStore` — log list + MUI Snackbar (replaces `Logger` + `MdcSnackbarService`).
  - `uiStore` — refresh signal (replaces the `"refresh"` EventAggregator channel).
- **`src/resources/services/`** — framework-agnostic logic reused from the
  original: `validation.ts`, `helper-service.ts` (verbatim), and
  `backend-service.ts` (Aurelia `HttpClient` swapped for a `fetch` wrapper in
  `api.ts`).
- **`src/views/`** — the UI as React components (MUI), one folder per region:
  `layout/`, `top-nav-bar/`, `left-nav/`, `middle-body/` (tab framework +
  General-tab variants + structural/relational tabs), `object-list/`,
  `object-card/`, `common/` (shared `ModalObjectSelect`, `ParentChildSelect`,
  `AppSnackbar`), `log-window/`, `footer/`, `right-nav/`, `auth/`.

## Shared DTOs (`@gds`)

The shared TypeScript DTOs in the sibling `../mmar-global-data-structure` are
consumed **unchanged** via a path alias `@gds` (configured in both
`vite.config.ts` and `tsconfig.json`). They are not copied or npm-installed.
DTOs are imported with explicit paths, e.g.
`import { SceneType } from "@gds/models/meta/Metamodel_scenetypes.structure";`
and (de)serialized with `class-transformer` exactly as the original does
(`reflect-metadata` is imported as the **first line** of `src/main.tsx`).

## Configuration

Config comes from Vite env vars (`import.meta.env.VITE_*`), surfaced through
`src/config.ts`:

| Var | Default | Meaning |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Base URL of `mmar-server` (browser context) |

Set it in `.env` / `.env.development`. The browser runs on the host, so keep
`VITE_API_URL=http://localhost:8000` even inside Docker (the `mmar_server`
service hostname does not resolve in the browser; it is host-mapped `8000:8000`).

## Run / build

```bash
npm install
npm run dev        # Vite dev server on http://localhost:5173
npm run build      # tsc --noEmit && vite build
npm run preview    # serve the production build
npm run typecheck  # tsc --noEmit
npm run test       # vitest run (unit tests for the reused services)
npm run lint       # eslint
```

The app talks to **`mmar-server` on `:8000`** (start it with
`cd ../mmar-server && npm run debug`, plus a reachable Postgres). Log in with
the dev credentials (`admin` / `admin`). It runs alongside the original Aurelia
metamodeling client (`:8070`) for side-by-side comparison.

## Scope

Functional parity with the Aurelia client: auth, the 10 left-nav object lists,
object create/save/delete, every populated tab and dialog (General-tab variants,
structural/relational tabs, rights tabs, file upload). The intentionally-inert
parts of the original — disabled File/View/Edit/Diagram top-nav menus, empty
right-nav and footer — are rendered as static stubs.
