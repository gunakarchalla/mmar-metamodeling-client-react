# Code guide (React newcomer-friendly)

This is a walkthrough of `mmar-metamodeling-client-react` written for someone who
is **new to React**. It doubles as a short React tour: each concept is explained
the first time it shows up. For the terse, reference-style overview see
[README.md](README.md); this file is the narrated version.

---

## What this app is

`mmar-metamodeling-client-react` is a **rewrite** of the existing Aurelia
metamodeling client (`../mmar-metamodeling-client`) on a different, more
mainstream stack. Functionally it is the same tool: a single-page web app for
designing *metamodels* (the "language" layer of MMAR — scene types, classes,
attributes, etc.). It talks to the same `mmar-server` on port 8000 and uses the
same shared data classes (`@gds`).

The stack swap is the whole point:

| Concern | Old (Aurelia) | New (React) |
|---|---|---|
| UI framework | Aurelia 2 | **React 18** |
| State / services | DI services + EventAggregator | **Zustand** stores |
| UI components | `@aurelia-mdc-web` | **MUI** (Material UI) |
| Build tool | webpack | **Vite** |

---

## A 5-minute React primer (just what this app uses)

Before the walkthrough, here are the React ideas that appear everywhere:

1. **A component is a function that returns markup.** That markup is JSX —
   HTML-like syntax inside JavaScript. `App()` returning `<AppLayout />` is a
   component rendering another component.

2. **Props** are the arguments you pass to a component, like HTML attributes:
   `<ObjectCard object={x} type="Class" />`. The child receives `{ object, type }`.

3. **State + re-rendering.** When data a component displays changes, React
   **re-runs the function** and updates the screen. The two ways data changes
   here:
   - `useState` — local state private to one component (e.g. the text in a
     search box).
   - **Zustand store** — global state shared across the whole app (the selected
     object, the logged-in user). When a store value changes, *every* component
     reading that value re-renders.

4. **Hooks** are special functions starting with `use…`. Rules: only call them at
   the top level of a component, never in loops/conditions. The ones here:
   - `useState` — local state.
   - `useEffect` — run side effects (fetch data, add event listeners) *after*
     render. The `[]` dependency array controls *when* it re-runs: `[]` = once on
     mount; `[x]` = whenever `x` changes. It can return a "cleanup" function
     (e.g. to remove a listener).
   - `useMemo` — cache an expensive computation so it only recomputes when its
     inputs change.
   - `useCallback` / `useRef` — stable function references / a mutable box that
     survives re-renders.

5. **The `key` prop.** When rendering a list with `.map(...)`, each item needs a
   unique `key` so React can track them. Here it is always the object's `uuid`.

That is enough to read everything below.

---

## How it is wired, top to bottom

### Entry point — [src/main.tsx](src/main.tsx)

This is where the app boots:
- Line 1: `import "reflect-metadata"` **must be first** — the shared `@gds` data
  classes use decorators (via `class-transformer`) that need this.
- It creates an MUI **theme** (the color palette + the "make all buttons black"
  overrides) and wraps the app in `<ThemeProvider>` so every MUI component can
  read those colors.
- `ReactDOM.createRoot(...).render(<App />)` mounts the React tree into
  `<div id="root">` from [index.html](index.html).
- `<React.StrictMode>` is a dev-only wrapper that double-invokes some functions
  to surface bugs — harmless, but it is why you may see effects run twice in
  development.

### The layout — [src/views/layout/AppLayout.tsx](src/views/layout/AppLayout.tsx)

This is the page skeleton: a top nav bar, a body, a footer, plus two
always-present overlays (the login dialog and the snackbar). Two things to notice
as a React learner:

- **Auth gating:** `{currentUser ? <MainBody /> : <Box />}` — this is
  conditional rendering. If logged in, show the app; otherwise show an empty box.
  `currentUser` comes from the auth store, so the moment you log in, this
  re-renders and `MainBody` appears.
- **The Ctrl+S handler** is a textbook `useEffect`: on mount it adds a `keydown`
  listener to `window`, and the returned function removes it on unmount. The `[]`
  means "set this up once."

### The body — [src/views/main-body/MainBody.tsx](src/views/main-body/MainBody.tsx)

- On mount it **pings the server** after a 1s delay (`useEffect`) and stores the
  result in `isConnected` local state. While `undefined` it shows a spinner;
  `false` shows "no connection"; `true` shows the real UI. This is the classic
  three-state async pattern.
- The real UI is three resizable columns (via `react-resizable-panels`):
  **LeftNav | MiddleBody | LogWindow**. `autoSaveId` persists your column widths
  to `localStorage`.

So the visual hierarchy is:

```
AppLayout
├─ TopNavBar          (menus, save/refresh/logout, sign-in button)
├─ MainBody
│   ├─ LeftNav        (10 collapsible category lists)
│   │   └─ ObjectList → ObjectCard (clickable tiles)
│   ├─ MiddleBody     (tabs for the selected object)
│   │   ├─ GeneralTab (+ type-specific variant)
│   │   └─ structural tabs (Attributes, Classes, …)
│   └─ LogWindow      (scrolling log)
├─ AppFooter
├─ SignInSignUpDialog
└─ AppSnackbar
```

---

## The heart: the four Zustand stores

This is the most important part to understand. In Aurelia, shared logic lived in
injectable "services" and components talked via an event bus. React has no
built-in equivalent, so this app uses **Zustand** — a tiny global-state library.
A store is created with `create(...)` and holds both **data and the functions
that change it**.

There are four, in [src/resources/store/](src/resources/store/):

### 1. [selectedObjectStore.ts](src/resources/store/selectedObjectStore.ts) — the big one (~1300 lines)

This is the in-memory copy of the entire metamodel: arrays of `sceneTypes`,
`classes`, `attributes`, etc., plus **which object is currently selected**
(`selectedObject` + `type`). Almost the whole rest of the app reads from here. It
exposes:
- collection getters/setters (`getClasses`, `setClasses`, `addClass`,
  `removeClass`…),
- selection logic (`setSelectedObject(uuid)`, `getTypeFromUuid`,
  `deselectObject`),
- and a huge family of `addChild` / `removeChild` mutators for editing an
  object's nested children (add a class to a scene type, add a reference to a
  role, etc.).

**Two React subtleties live here that are worth internalizing**, because they are
the trickiest part of this whole codebase:

- **The `reref` trick + `revision` counter.** React decides "did this change?" by
  checking if the *object reference* is new (`===`), not by deep comparison. But
  these gds objects are class instances mutated *in place* (`so.classes.push(...)`).
  A mutated-in-place object is still `===` its old self, so React would not
  re-render. The fix: `reref` makes a shallow clone with the same prototype (so
  the class methods survive) but a **new identity**, and `commit()` also bumps a
  `revision` counter. Components that need to react to in-place edits subscribe to
  `revision`. This replaces Aurelia's automatic deep observation, which React
  does not have.

- **Two ways to read a store**, and the difference matters:
  - `useSelectedObjectStore((s) => s.selectedObject)` — the **hook form**, used
    inside a component's body. It *subscribes*: the component re-renders when that
    slice changes.
  - `useSelectedObjectStore.getState().setSelectedObject(uuid)` — the
    **imperative form**, used inside event handlers/services. It just reads/calls
    *without* subscribing. You will see both all over; the rule of thumb is "hook
    form in the render body, `getState()` in callbacks and non-component code."

### 2. [authStore.ts](src/resources/store/authStore.ts) — login/logout/signup

Holds `currentUser` and JWT helpers. The token lives in
`localStorage["auth_token"]`; admin-ness is read by decoding the JWT
(`jwtDecode`). The last line (`setCurrentUser()`) runs once at import time to
restore your session from a stored token on page load.

### 3. [uiStore.ts](src/resources/store/uiStore.ts) — the refresh signal

The smallest store, but conceptually neat. The old app published a `"refresh"`
event on a bus; here, `triggerRefresh()` just **increments a number**
(`refreshNonce`). Any component that wants to reload when "refresh" fires
subscribes to that number and puts it in a `useEffect` dependency array — so when
the number changes, the effect re-runs. `refreshType` distinguishes a *full*
reload (login / Refresh button) from a *partial* one (after a save, reload only
the current category).

### 4. [logStore.ts](src/resources/store/logStore.ts) — logging + the snackbar

`log(value, status)` prepends to a list (shown in the LogWindow) and, on
`"error"`, pops a MUI snackbar toast. This replaces the old `Logger` + MDC
snackbar service.

---

## The services layer — [src/resources/services/](src/resources/services/)

This is **framework-agnostic** code — plain TypeScript, no React. Some of it
(`validation.ts`, `helper-service.ts`) is copied verbatim from the original.

- [api.ts](src/resources/services/api.ts) — a thin `fetch` wrapper that prefixes
  the server URL and sets default headers. The one clever bit: it sets
  `Content-Type: application/json` for JSON bodies but **deliberately not** for
  `FormData` (file uploads), because the browser must set the multipart boundary
  itself.

- [backend-service.ts](src/resources/services/backend-service.ts) — the REST
  client. Every server call lives here: `getClasses()`, `createNewObject(type)`,
  `saveSelectedObject()`, `deleteObject(...)`, etc. The pattern is consistent:
  call the API, deserialize into a gds class (`SceneType.fromJS(...)`), and **push
  the result into `selectedObjectStore`**. It is exported as a `backendService`
  **singleton** — components just `import { backendService }` and call methods, no
  DI needed. Note it reaches into stores via `getState()` because it is not a
  component.

---

## The views, walking down

### [LeftNav.tsx](src/views/left-nav/LeftNav.tsx) — the category sidebar

A great example of the refresh pattern. It defines `SECTIONS` (the 10 object
categories, each with a `load` function). Its `useEffect` depends on
`[refreshNonce]` — so it loads on mount *and* every time `triggerRefresh()` is
called anywhere. `refreshType` decides full vs. partial reload. `adminOnly`
sections (Users, Usergroups) are filtered out unless you are admin. Each section
is an MUI `Accordion` that shows a progress bar while loading, then an
`ObjectList`.

### [ObjectList.tsx](src/views/object-list/ObjectList.tsx) → [ObjectCard.tsx](src/views/object-card/ObjectCard.tsx)

`ObjectList` reads its slice of the store *by type* (`TYPE_TO_FIELD` maps
`"Class"` → the `classes` array), provides search/add/remove, and renders one
`ObjectCard` per item. Note the `useMemo` for the sorted+filtered list — it only
recomputes when the list or the search term changes.

`ObjectCard` is a clickable tile. Clicking it (`onButtonClicked`) **saves the
previously-selected object, then selects this one** — the same behavior as the
original. `isSelected` is computed by subscribing to just the selected uuid, so
only the relevant cards re-render when selection changes.

### [MiddleBody.tsx](src/views/middle-body/MiddleBody.tsx) — the tab framework

Given the selected object's `type`, it filters `tabDefinitions` down to the tabs
that apply (a `SceneType` gets General/Attributes/Classes/Ports/RelationClasses/
Procedures; an `AttributeType` gets General/Reference/Table; etc.). Selecting a
new object resets the active tab to "General" via a `useEffect` keyed on
`selectedObject?.uuid`. It renders `GeneralTab` for the General tab and looks up a
component from `TAB_COMPONENTS` for the rest.

### The General tab — [GeneralTab.tsx](src/views/middle-body/general-tab/GeneralTab.tsx) + [fields.tsx](src/views/middle-body/general-tab/fields.tsx)

Shows the shared fields (uuid, name, description, geometry, coordinates) and then
a **type-specific sub-component** (`GeneralTabClass`, `GeneralTabUser`, …) chosen
by `type`. The fields are **controlled inputs** — a key React concept: the
input's `value` comes *from* state and its `onChange` writes *back* to state.
Here `BoundText` reads `obj.<path>` and calls `update(path, newValue)` →
`updateSelectedField` in the store, which mutates the nested field in place and
`commit()`s. This is how React achieves two-way binding (which Aurelia gave you
for free).

### The structural tabs + [ParentChildSelect.tsx](src/views/common/ParentChildSelect.tsx)

This is the cleverest reuse in the app. Tabs like
[ClassesTab.tsx](src/views/middle-body/structural-tabs/ClassesTab.tsx) are just
thin wrappers — three lines that hand a child array and a type string to one
shared, generic `ParentChildSelect` component. That component renders a
searchable/sortable table of children, with add (via
[ModalObjectSelect.tsx](src/views/common/ModalObjectSelect.tsx)), remove, edit,
inline min/max editing, UI-component dropdowns, and row reordering — branching its
columns/behavior on the type ("Role" types show min/max, "Attribute"/"Column"
show a UI-component dropdown, etc.). It subscribes to `revision` so it re-renders
after in-place child edits.

`ModalObjectSelect` is the "add" dialog: a searchable table of candidates; on
confirm it calls `addChild(uuid, type)` for each pick.

### [TopNavBar.tsx](src/views/top-nav-bar/TopNavBar.tsx) and the rest

TopNavBar has the File/View/Edit/Diagram menus (intentionally **disabled stubs**
— parity with the original, which also has them inert), plus working Refresh
(`triggerRefresh`), Save, admin-only Test, and Sign In/Out.
[SignInSignUpDialog.tsx](src/views/auth/SignInSignUpDialog.tsx) does login/signup
and fires a full refresh on success.

---

## Build-time glue worth knowing

[vite.config.ts](vite.config.ts) sets up two path aliases:
- `@` → `src` (so `@/resources/...` instead of `../../..`).
- `@gds` → the sibling `../mmar-global-data-structure` repo — the shared DTOs are
  consumed **directly from source**, not npm-installed or copied.

It also **stubs out `jsonwebtoken`** (a Node-only library the shared `User` class
imports for server-side signing) so it does not crash the browser bundle — see
[src/stubs/jsonwebtoken.ts](src/stubs/jsonwebtoken.ts). This kind of "shared code
assumes Node, but we are in a browser" friction is common when sharing models
between server and client.

---

## The one mental model to keep

Everything flows through the stores:

```
User clicks a card / edits a field / hits Save
        │
        ▼
event handler calls a store action  or  backendService method
        │
        ▼
store data changes (and reref/revision bumps for in-place edits)
        │
        ▼
every component subscribed to that slice re-renders automatically
```

If you internalize "**components read state from Zustand and re-render when it
changes; handlers and services write state back**," the rest of the file
structure is just regions of UI hanging off that loop.
