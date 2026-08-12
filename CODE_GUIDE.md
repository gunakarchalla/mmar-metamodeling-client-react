# Code guide (React newcomer-friendly)

A walkthrough of `mmar-metamodeling-client-react` written for someone who is
**new to React**. It doubles as a short React tour: each concept is explained the
first time it shows up. For the terse, reference-style overview see
[README.md](README.md); this file is the narrated version.

**Who reads this.** Two audiences, and they want different things:

- *Newcomers to the codebase* — read top to bottom.
- *Agents porting the sibling `mmar-modeling-client`* — `../plan.md` names this
  repo the **stylistic source of truth** and tells each agent to read this guide
  once per run. If that's you, the load-bearing sections are
  [the stores](#the-heart-the-five-zustand-stores), [the services
  layer](#the-services-layer), [engine lifecycle](#engine-lifecycle) and
  [gotchas](#gotchas) — they encode decisions that were expensive to learn.

---

## What this app is

`mmar-metamodeling-client-react` is a **rewrite** of the Aurelia metamodeling
client (`../mmar-metamodeling-client`) on a different, more mainstream stack.
Functionally it is the same tool: a single-page web app for designing
*metamodels* (the "language" layer of MMAR — scene types, classes, attributes,
etc.). It talks to the same `mmar-server` on port 8000 and uses the same shared
data classes (`@gds`).

The stack swap is the whole point:

| Concern | Old (Aurelia) | New (React) |
|---|---|---|
| UI framework | Aurelia 2 | **React 18** |
| State / services | DI services + EventAggregator | **Zustand** stores |
| UI components | `@aurelia-mdc-web` | **MUI** (Material UI) |
| Build tool | webpack | **Vite** |

There is **no router**. Navigation is "what is selected", held in a singleton
store, plus a refresh signal — mirroring the original's `SelectedObjectService` +
`EventAggregator`.

---

## A 5-minute React primer (just what this app uses)

Before the walkthrough, here are the React ideas that appear everywhere:

1. **A component is a function that returns markup.** That markup is JSX —
   HTML-like syntax inside JavaScript. `App()` returning `<AppLayout />` is a
   component rendering another component.

2. **Props** are the arguments you pass to a component, like HTML attributes:
   `<ObjectListItem object={x} type="Class" />`. The child receives
   `{ object, type }`.

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
   unique `key` so React can track them. Here it is almost always the object's
   `uuid`.

6. **Controlled inputs.** An input whose `value` comes *from* state and whose
   `onChange` writes *back* to state. This is how React does two-way binding,
   which Aurelia gave you for free. Every field in the General tab works this way.

That is enough to read everything below.

---

## How it is wired, top to bottom

### Entry point — [src/main.tsx](src/main.tsx)

This is where the app boots:
- Line 1: `import "reflect-metadata"` **must be first** — the shared `@gds` data
  classes use decorators (via `class-transformer`) that need this.
- It creates an MUI **theme** (a palette tuned to the original's
  `color_definition.scss`, plus overrides that make every button black and give
  tooltips arrows) and wraps the app in `<ThemeProvider>` so every MUI component
  can read those colors. `<CssBaseline />` normalizes browser styles.
- `ReactDOM.createRoot(...).render(<App />)` mounts the React tree into
  `<div id="root">` from [index.html](index.html).
- `<React.StrictMode>` is a dev-only wrapper that double-invokes some functions
  to surface bugs — harmless, but it is why you may see effects run twice in
  development. It is also why [the engine](#engine-lifecycle) works as hard as it
  does to be idempotent.

[App.tsx](src/App.tsx) is a one-liner returning `<AppLayout />`.

### The layout — [src/views/layout/AppLayout.tsx](src/views/layout/AppLayout.tsx)

The page skeleton: a top nav bar, a body, a footer, plus two always-present
overlays (the login dialog and the snackbar). Three things to notice as a React
learner:

- **Auth gating:** `{currentUser ? <MainBody /> : <Box />}` — conditional
  rendering. If logged in, show the app; otherwise an empty box. `currentUser`
  comes from the auth store, so the moment you log in this re-renders and
  `MainBody` appears.
- **Auto-open login:** a `useEffect` keyed on `[currentUser]` opens the sign-in
  dialog whenever nobody is logged in.
- **The Save handler** is a textbook `useEffect`: on mount it adds a `keydown`
  listener to `window`, and the returned function removes it on unmount. The `[]`
  means "set this up once."
- **The undo/redo shortcuts** are a second such effect. They skip events
  originating inside `.monaco-editor` purely to avoid a double step — the editor
  binds the same chords to the same store actions itself. See
  [undo/redo](#undoredo-per-tab-history).
- **Both are platform-aware.** The chords are Ctrl-based on Windows/Linux and
  ⌘-based on macOS:

  | Action | Windows / Linux | macOS |
  |---|---|---|
  | Save | Ctrl+S | ⌘S |
  | Undo | Ctrl+Z | ⌘Z |
  | Redo | Ctrl+Shift+Z, Ctrl+Y | ⌘⇧Z, ⌘Y |

  Neither handler tests `event.ctrlKey` directly; both go through
  [`hasCommandModifier`](src/resources/util/platform.ts), whose OS detection
  deliberately mirrors Monaco's own (a `"Macintosh"` substring in the user agent).
  That matters because the code editor binds *its* copies of these chords through
  `KeyMod.CtrlCmd`, which Monaco decodes to `metaKey` on macOS and `ctrlKey`
  elsewhere — if the two disagreed about the platform, one of them would obey the
  wrong key. Note `⌘` must not be interchangeable with Ctrl: accepting either
  would make Ctrl+Z (a no-op chord on macOS) silently undo.
- **The `beforeunload` guard** is a second window-level `useEffect` alongside it.
  It cancels a real browser navigation (reload / tab close) — raising the native
  "Leave site?" prompt — but only while `hasUnsavedTabs()` is true. This is the
  browser-level counterpart to the Toolbar Refresh button's MUI confirm: the
  store is memory-only, so any such navigation would silently drop every open tab
  and its unsaved edits. Browsers ignore custom prompt text, so it just sets
  `returnValue` to trigger the default dialog.

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
├─ TopNavBar          (6 menus, undo/redo/refresh/test/save, sign-in button)
├─ MainBody
│   ├─ LeftNav        (10 collapsible category lists)
│   │   └─ ObjectList → ObjectListItem (clickable rows)
│   ├─ MiddleBody     (tabs for the selected object)
│   │   ├─ ObjectTabs (VS-Code-style strip of open objects)
│   │   ├─ GeneralTab (+ type-specific variant, + VizRep editor for 3 types)
│   │   └─ structural tabs (Attributes, Classes, …)
│   └─ LogWindow      (scrolling log)
├─ AppFooter
├─ SignInSignUpDialog
└─ AppSnackbar
```

---

## The heart: the five Zustand stores

This is the most important part to understand. In Aurelia, shared logic lived in
injectable "services" and components talked via an event bus. React has no
built-in equivalent, so this app uses **Zustand** — a tiny global-state library.
A store is created with `create(...)` and holds both **data and the functions
that change it**.

All five live in [src/resources/store/](src/resources/store/):

| Store | Lines | Replaces | Holds |
|---|---:|---|---|
| [selectedObjectStore.ts](src/resources/store/selectedObjectStore.ts) | 1645 | `SelectedObjectService` | the metamodel tree + current selection + open tabs + per-tab undo history |
| [authStore.ts](src/resources/store/authStore.ts) | 157 | `UserService` | `currentUser`, JWT helpers |
| [editorStore.ts](src/resources/store/editorStore.ts) | 52 | vizrep's globals | the Monaco buffer + preview UI state |
| [logStore.ts](src/resources/store/logStore.ts) | 35 | `Logger` + `MdcSnackbarService` | log list + snackbar |
| [uiStore.ts](src/resources/store/uiStore.ts) | 24 | the `"refresh"` EA channel | the refresh signal |

### 1. selectedObjectStore — the big one

The in-memory copy of the entire metamodel: arrays of `sceneTypes`, `classes`,
`attributes`, etc., plus **which object is currently selected** (`selectedObject`
+ `type` + `selectedTab`). Almost the whole rest of the app reads from here. It
exposes:

- collection getters/setters (`getClasses`, `setClasses`, `addClass`,
  `removeClass`…) plus generic `getObjects(type)` / `setObjects` / `addObject` /
  `removeObject` that dispatch on a type string;
- selection logic (`setSelectedObject(uuid)`, `getTypeFromUuid`,
  `deselectObject`, `resetObjects`);
- a large family of `addChild(uuid, type)` / `removeChild(uuid, type)` mutators
  for editing an object's nested children, plus `updateMinMax`;
- `updateSelectedField(path, value)` — the two-way-binding workhorse for the
  General tab;
- `getIcon(geometry)` — see [gotchas](#gotchas), it is stranger than it looks.

**Four things here are worth internalizing**, because they are the trickiest part
of this whole codebase:

- **The `reref` trick + `revision` counter.** React decides "did this change?" by
  checking if the *object reference* is new (`===`), not by deep comparison. But
  these gds objects are class instances mutated *in place*
  (`so.classes.push(...)`). A mutated-in-place object is still `===` its old
  self, so React would not re-render. The fix: `reref` makes a shallow clone with
  the same prototype (so any class methods survive) but a **new identity**, and
  `commit()` also bumps a `revision` counter. Components that need to react to
  in-place edits subscribe to `revision`. This replaces Aurelia's automatic deep
  observation, which React does not have.

- **`selectedObject` is a working copy.** `setSelectedObject` stores a `reref`'d
  clone, deliberately decoupled from the item in the collection array. So while
  you type a new name, the card in the left-nav list still shows the old one —
  the list only catches up when `saveSelectedObject` → `updateLocalObject`
  replaces the collection item with the server's response. That is intended
  behavior, not a bug.

- **`selectedObject` / `type` / `selectedTab` are a *mirror* of the active open
  tab.** See [open tabs](#open-tabs-the-vs-code-strip) — the store keeps one
  working copy per open object, and those three fields always reflect whichever
  one is focused. Every existing reader of `selectedObject` therefore kept
  working unchanged when tabs were added.

- **`type` is the discriminator, not `instanceof`.** The store carries a `type`
  string (`"Class"`, `"RelationClass"`, `"Port"`, …) alongside the object, and
  *everything* branches on it. See [Type dispatch](#type-dispatch-type-never-instanceof)
  for why `instanceof` is actively broken here.

- **Two ways to read a store**, and the difference matters:
  - `useSelectedObjectStore((s) => s.selectedObject)` — the **hook form**, used
    inside a component's body. It *subscribes*: the component re-renders when
    that slice changes.
  - `useSelectedObjectStore.getState().setSelectedObject(uuid)` — the
    **imperative form**, used inside event handlers/services. It just reads/calls
    *without* subscribing. You will see both all over; the rule of thumb is "hook
    form in the render body, `getState()` in callbacks and non-component code."

#### Open tabs (the VS Code strip)

The store holds `openTabs: OpenTab[]` (ordered as opened) plus `activeTabUuid`.
An `OpenTab` is `{ uuid, type, object, innerTab, dirty }` — **its own working
copy** of the object, plus which sub-tab it was left on. The rules:

- `setSelectedObject(uuid)` **opens or focuses**. If a tab for that uuid already
  exists it delegates to `activateTab` and returns early — re-reading the
  collection there would silently throw away that tab's unsaved edits. A new tab
  starts on `"General"`, which is where the old MiddleBody effect that reset the
  sub-tab on every selection went; re-focusing an existing tab restores its
  `innerTab` instead.
- **`dirty` is set by `commit()`**, the same choke point every in-place mutator
  and `updateSelectedField` already went through — so "has unsaved changes"
  needs no separate bookkeeping and cannot drift. It is cleared by
  `markTabClean(uuid)`, called from `backendService.saveObject` on a 200.
- `closeTab(uuid)` is **unconditional** — the unsaved-changes prompt lives in the
  UI, and by the time the store is called the decision is made. Closing the
  active tab focuses the neighbour that slid into its slot (else the one to its
  left); closing the last one clears the selection.
- `deselectObject()` now means "nothing open at all" (it calls `closeAllTabs`).
  Its only caller is `resetObjects()`, i.e. the full refresh — which replaces
  every collection the working copies came from, so keeping them would be wrong.
  `removeObject()` closes just the deleted object's tab.

`backendService.saveObject(object, type)` exists because of this: the close
prompt has to save a **background** tab, and `saveSelectedObject()` could only
ever save the active one. The latter is now a one-line delegation.

#### Undo/redo (per-tab history)

Each `OpenTab` also carries a `history: TabHistory` — `entries` (snapshots of its
working copy, oldest → newest), `index` (which one the tab currently shows) and
`savedIndex`. `undo()` / `redo()` step the **active** tab only, which is what
makes "undo" mean the same thing as the tab strip's dirty dot.

The whole feature hangs off **one hook: `commit()`/`setSelected()`** — the same
choke point `dirty` already rode on. Every mutator in the store (General-tab
fields, structural add/remove, `updateMinMax`, row reordering, the Monaco
live-commit) already funnels through it, so undo covers *every* kind of change
with no per-mutator bookkeeping that could drift out of sync. Four things are
load-bearing:

- **Snapshots are `deepClone`, not `reref`.** `reref` is shallow on purpose, but
  the nested structures it keeps sharing (`classes`, `role_from.class_references`,
  `has_table_attribute`, …) are exactly the ones the in-place mutators edit — a
  shallow snapshot would be rewritten from under the history by the next edit and
  undo would restore nothing. Restoring clones *again* on the way out, for the
  same reason in reverse.
- **Keystroke coalescing.** `updateSelectedField` passes the field path as a
  coalescing key, so a run of edits to one field within 600 ms collapses into a
  single undo step — otherwise undoing a typed-in name would cost one press per
  character. Structural mutators pass no key and so always get their own step.
- **`dirty` is now derived: `index !== savedIndex`.** So undoing back to the last
  saved state genuinely un-dirties the tab (and the ✕ comes back), and
  `markTabClean` just parks `savedIndex` on the current index. A new edit made
  after an undo discards the redo branch — and `savedIndex` with it, if that is
  where the branch was.
- **Geometry has mirrors.** A step that changes `geometry` must also push it into
  the Monaco buffer and redraw the canvas — but *only* when it actually changed,
  or an undo of an unrelated field would replace the beautified buffer with the
  object's raw source (D8). `@monaco-editor/react` guards programmatic `value`
  pushes with an internal `preventTriggerChangeEvent` flag, so this does **not**
  re-fire `onChange` and clobber the redo branch.

**Monaco is treated as just another bound field.** `CodeEditor`'s `onMount`
rebinds Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y to the store's `undo`/`redo`, displacing
Monaco's own buffer history. This is not a stylistic preference — leaving
Monaco's native undo in place is actively broken here, because live commit (D2)
turns it into a *forward* edit: it reverts the buffer, `onChange` fires,
`updateSelectedField` pushes a new history entry, and the tab stays dirty even
once the code reads character-for-character identical to what was saved. Routing
the keys to the tab history makes geometry undo behave like the name field —
including going clean again. It has to be registered on the editor rather than on
`window`, because Monaco's keybinding service calls `stopPropagation()` for every
key it resolves; `addCommand` registers as an **override** (weight 1000) layered
over the built-in keybindings, which is what displaces the default. The trade-off
is deliberate: you lose character-level undo inside the editor and get one step
per coalesced edit run, the same granularity as every other field.

The controls are the toolbar arrows and Edit ▸ Undo/Redo, both driven by the
exported `selectCanUndo` / `selectCanRedo` selectors. They return **booleans**, so
a subscriber re-renders only when availability flips — not on every keystroke that
pushes a snapshot.

Undo is deliberately scoped to a tab's working copy: creating and deleting objects
are server round-trips, not tab edits, and stay outside the stack.

### 2. authStore — login/logout/signup

Holds `currentUser` and JWT helpers. The token lives in
`localStorage["auth_token"]`; admin-ness is read by decoding the JWT
(`jwtDecode`). Every `localStorage` access is wrapped in try/catch so the store
can be imported in a non-DOM (vitest/node) context without throwing at module
load. The last line (`useAuthStore.getState().setCurrentUser()`) runs once at
import time to restore your session from a stored token on page load — the
equivalent of the original `UserService` constructor.

### 3. uiStore — the refresh signal

The smallest store, but conceptually neat. The old app published a `"refresh"`
event on a bus; here, `triggerRefresh()` just **increments a number**
(`refreshNonce`). Any component that wants to reload when "refresh" fires
subscribes to that number and puts it in a `useEffect` dependency array — so when
the number changes, the effect re-runs. `refreshType` distinguishes a *full*
reload (login / Refresh button, which passes `"Refresh button"`) from a *partial*
one (`undefined`, after a save — reload only the current category and keep the
selection).

### 4. logStore — logging + the snackbar

`log(value, status)` **prepends** to a list (newest first — the original used
`unshift`), shown in the LogWindow, and on `"error"` also pops a MUI snackbar
toast. Non-component code reaches it through the
[logger shim](src/resources/services/logger.ts).

### 5. editorStore — the Monaco buffer

Holds `codeEditorValue` (the geometry being edited), plus `threeDimensional`,
`selectedTab`, `tabs` and `readyForVizRepUpdate` — the React-facing mirror of the
UI-state fields the old client kept on its Three.js global. It is deliberately
separate from `selectedObject.geometry`: the buffer can be beautified or
half-typed without that implying a change to the object. `DEFAULT_VIZREP_CODE` is
the placeholder shown when nothing is selected, copied verbatim from the old
`global_definitions.ts`.

---

## The services layer

Everything under [src/resources/services/](src/resources/services/) is
**framework-agnostic** code — plain TypeScript, no React, no JSX. Several files
are ports where the Aurelia DI was stripped: constructor-injected dependencies
became module-singleton imports, and bodies were otherwise left alone. Where a
comment says "body unchanged", **keep it that way** — the point is diffability
against the original.

| File | Role |
|---|---|
| [api.ts](src/resources/services/api.ts) | `fetch` wrapper: prefixes `API_URL`, sets default headers |
| [backend-service.ts](src/resources/services/backend-service.ts) | the REST client (singleton) |
| [event-bus.ts](src/resources/services/event-bus.ts) | typed pub/sub shim replacing `EventAggregator` |
| [logger.ts](src/resources/services/logger.ts) | shim so engine ports keep calling `this.logger.log(...)` |
| [meta-utility.ts](src/resources/services/meta-utility.ts) | VizRep function parsing/eval + file cache warmup |
| [instance-utility.ts](src/resources/services/instance-utility.ts) | scene-instance / tab-context helpers |
| [file-utility.ts](src/resources/services/file-utility.ts) | UUID → file-content cache, server-backed |
| [expression-utility.ts](src/resources/services/expression-utility.ts) | expression evaluation for vizreps |
| [helper-service.ts](src/resources/services/helper-service.ts) | `DataUrltoFile` / `FiletoDataUrl` |
| [validation.ts](src/resources/services/validation.ts) | regex validation (verbatim from the original) |

Plus three small helpers in [src/resources/util/](src/resources/util/):
`textify.ts` (port of the Aurelia value converter), `describe-error.ts`
(renders an unknown thrown value as a log-safe string — necessary because
user-authored geometry can `throw` anything, not just an `Error`) and
`platform.ts` (which modifier key means "command" here — see
[the layout](#the-layout--srcviewslayoutapplayouttsx)).

### api.ts

A thin `fetch` wrapper. The one clever bit: it sets `Content-Type:
application/json` for JSON bodies but **deliberately not** for `FormData` (file
uploads), because the browser must set the multipart boundary itself or multer
cannot parse the upload.

### backend-service.ts

Every server call lives here: `getClasses()`, `createNewObject(type)`,
`saveSelectedObject()`, `deleteObject(...)`, `ping()`, etc. It is exported as a
`backendService` **singleton** — components just `import { backendService }` and
call methods, no DI needed. Because it is not a component, it reaches into stores
via `getState()`.

Two patterns worth knowing:

- **`getCorrectType(type)`** maps the store's type tag to the REST path segment
  (`"RelationClass"` → `"relationclasses"`, `"UserGroup"` → `"userGroups"`, …).
  Users and usergroups also live off the `metamodel/` prefix, so most methods
  carry a couple of `if (type === "users") url = …` special cases.
- **Saves are `PATCH …?hardpatch=true`.** "Hard" means the server treats the
  payload as authoritative and deletes what is absent — which is why
  [`selectedObjectRemoveReferenceRole`](src/resources/store/selectedObjectStore.ts)
  bothers to drop an emptied `role` entirely rather than leave it empty.

**Deserialization is inconsistent, and that matters.** Only `getSceneTypes()` and
`sceneInstancesAllGET()` revive their responses into gds classes (`fromJS`). The
generic `fetchData()` used by every other list pushes the **raw parsed JSON**
straight into the store. So most objects in `selectedObjectStore` are plain
objects whose prototype is `Object.prototype`. Do not write `instanceof` against
them — see [below](#type-dispatch-type-never-instanceof).

---

## The views, walking down

### [LeftNav.tsx](src/views/left-nav/LeftNav.tsx) — the category sidebar

A great example of the refresh pattern. It defines `SECTIONS` (the 10 object
categories, each with a `load` function, in the same order as the original). Its
`useEffect` depends on `[refreshNonce]` — so it loads on mount *and* every time
`triggerRefresh()` is called anywhere. `refreshType` decides full vs. partial
reload (a `didMount` ref makes the very first run always a full reload).
`adminOnly` sections (Users, Usergroups) are filtered out unless you are admin.
Each section is an MUI `Accordion` that shows a progress bar while loading, then
an `ObjectList`.

### [ObjectList.tsx](src/views/object-list/ObjectList.tsx) → [ObjectListItem.tsx](src/views/object-list-item/ObjectListItem.tsx)

`ObjectList` reads its slice of the store *by type* (`TYPE_TO_FIELD` maps
`"Class"` → the `classes` array), provides search/add/remove, and renders one
`ObjectListItem` per item inside a dense MUI `List`. Note the `useMemo` for the
sorted+filtered list — it only
recomputes when the list or the search term changes. "Remove selected" is enabled
only when the selection belongs to *this* section (`selectedObject` is global, so
without that check every section's button would light up at once).

`ObjectListItem` is a clickable row — a small icon (the object's own VizRep
icon, via the store's `getIcon`) followed by its name on one dense line, with the
description in a tooltip. Clicking it (`onButtonClicked`) **opens the object in a
tab, or focuses the tab it is already open in**. The original also saved the
outgoing selection first; that was removed when tabs landed, because auto-saving
on every click makes an unsaved tab impossible to observe — the dirty marker
would clear itself the moment you navigated away. Saving is now always
deliberate: Save / Ctrl+S, or the close prompt.

`isSelected` is computed by subscribing to just the selected uuid, so only the
relevant rows re-render when selection changes; the active tab's row is disabled
(with `opacity: 1` restored, so it stays legible) so it cannot be re-clicked. A
second boolean selector (`openTabs.some`) gives background-tab rows a dashed left
border — a boolean, so only rows whose open-state actually flipped re-render.

### [ObjectTabs.tsx](src/views/object-tabs/ObjectTabs.tsx) — the open-object strip

Rendered at the top of `MiddleBody`. One MUI `Tab` per entry in the store's
`openTabs`, labelled with the object's name and a close affordance:

- a **clean** tab shows a ✕;
- a **dirty** tab shows a coloured circle instead — and, like VS Code, the circle
  turns back into a ✕ while the pointer is over it (the label is also italic).

The close affordance sits *inside* the Tab's label, so it stops both `mousedown`
and `click` — otherwise MUI would read the same click as "select this tab".

Closing a dirty tab opens the unsaved-changes dialog: **Save changes** →
`saveObject(tab.object, tab.type)` then close then refresh; **Discard changes** →
close, no request. **Dismissing the dialog (Esc / backdrop) does nothing** — the
tab stays open with its edits intact. That "do nothing" is a requirement, not an
oversight, and it is pinned by a test.

### [MiddleBody.tsx](src/views/middle-body/MiddleBody.tsx) — the tab framework

Given the selected object's `type`, it filters `tabDefinitions` (14 rows, copied
verbatim from the original) down to the tabs that apply — a `SceneType` gets
General/Attributes/Classes/Ports/RelationClasses/Procedures; an `AttributeType`
gets General/Reference/Table; and so on. The active tab lives in the **store**
(`selectedTab`, mirrored per open tab as `innerTab`), not in local state; a guard
falls back to the first visible tab if the current one is not in the visible set.
Note there is **no** effect resetting the sub-tab on selection any more — the
store does it, and only for newly opened tabs. It renders
`GeneralTab` for the General tab and looks up a component from `TAB_COMPONENTS`
(13 entries) for the rest.

### The General tab — [GeneralTab.tsx](src/views/middle-body/general-tab/GeneralTab.tsx) + [fields.tsx](src/views/middle-body/general-tab/fields.tsx)

Shows the shared fields (uuid, name, description, three coordinate fieldsets,
rotation), then the **geometry field**, then a **type-specific sub-component**
chosen by `type` — one of eight: `GeneralTabAttribute`, `GeneralTabAttrType`,
`GeneralTabClass`, `GeneralTabUsrGrp`, `GeneralTabRelationclass`,
`GeneralTabUser`, `GeneralTabProcedure`, `GeneralTabFile`.

The fields are **controlled inputs**. `BoundText` / `BoundNumber` / `CoordFieldset`
read `obj.<path>` and call `update(path, newValue)` → `updateSelectedField` in the
store, which walks the dotted path, mutates the nested field in place and
`commit()`s. `updateSelectedField` **auto-creates missing intermediate objects**,
which is load-bearing: `coordinates_2d` and friends are left `undefined` by the
gds constructor, so without it the X/Y/Z inputs could never be edited at all.

The geometry slot is **conditional**: for `Class`, `RelationClass` and `Port` it
renders the full [VizRep geometry editor](#the-vizrep-geometry-editor) (Monaco +
Preview + 3D canvas); every other type keeps a plain geometry textarea.

Two of the variants ([GeneralTabAttribute](src/views/middle-body/general-tab/GeneralTabAttribute.tsx),
[GeneralTabRelationclass](src/views/middle-body/general-tab/GeneralTabRelationclass.tsx))
use [InlineObjectPicker.tsx](src/views/middle-body/general-tab/InlineObjectPicker.tsx),
a focused single-select picker, to set the attribute type / bendpoint.
[GeneralTabFile](src/views/middle-body/general-tab/GeneralTabFile.tsx) adds a
download + replace flow via
[DialogUploadFile.tsx](src/views/middle-body/general-tab/general-tab-file/DialogUploadFile.tsx).

### The structural tabs + [ParentChildSelect.tsx](src/views/common/ParentChildSelect.tsx)

This is the cleverest reuse in the app. All 13 tabs in
[structural-tabs/](src/views/middle-body/structural-tabs/) are thin wrappers —
a handful of lines that hand a child array and a type string to one shared,
generic `ParentChildSelect`:

```tsx
export default function ClassesTab() {
  const selectedObject = useSelectedObjectStore((s) => s.selectedObject);
  return <ParentChildSelect items={(selectedObject as any)?.classes}
                            objecttypetoadd="Class" sortable />;
}
```

`ParentChildSelect` renders a searchable/sortable table of children with add (via
[ModalObjectSelect.tsx](src/views/common/ModalObjectSelect.tsx)), remove, edit,
inline min/max editing, UI-component dropdowns, and row reordering — branching its
columns and behavior on that one type string. It subscribes to `revision` so it
re-renders after in-place child edits.

The type string is a **pseudo-type**: not always a real object type, but a routing
key into the store's `addChild`/`removeChild` switch. `"Source"`/`"Destination"`
mean a relation class's `role_from`/`role_to`; `"Role"` means an attribute type's
references; `"Column"` means a table column; `"read_right"` / `"write_right"` /
`"delete_right"` / `"can_create_instance"` mean usergroup rights (plain uuid
arrays, which is why `ParentChildSelect` resolves each one via
`getObjectFromUuid`). Role-ish types show Type/Min/Max columns;
`"Attribute"`/`"Column"` show the UI-component dropdown.

`ModalObjectSelect` is the "add" dialog: a searchable table of candidates,
single- or multi-select; on confirm it calls `addChild(uuid, type)` for each pick.
Both it and `ParentChildSelect` match the search term against name, description
**and type name**, so searching "SceneType" returns every scene type.

### [TopNavBar.tsx](src/views/top-nav-bar/TopNavBar.tsx) and the rest

TopNavBar has six menus — File, View, Edit, Diagram, Settings, Algorithms —
which are intentionally **disabled stubs**: they open, but every item is inert,
matching the original. The one exception is **Edit ▸ Undo/Redo**, which shares the
toolbar arrows' [per-tab history](#undoredo-per-tab-history) (an item is live iff
it carries an `action`). The other working controls are the toolbar's Undo/Redo
arrows, Refresh (`triggerRefresh("Refresh button")`, but confirms first when any
open tab has unsaved changes — a full refresh discards them all), Save (persist +
refresh), an admin-only Test button that `console.log`s the selection, and
Sign In/Out.

[SignInSignUpDialog.tsx](src/views/auth/SignInSignUpDialog.tsx) does login/signup
and fires a full refresh on success.
[LogWindow.tsx](src/views/log-window/LogWindow.tsx) renders `logStore.logArray`
(newest at top) with an expand-to-dialog button.
[AppSnackbar.tsx](src/views/common/AppSnackbar.tsx) is bound to `logStore.snackbar`.
[AppFooter.tsx](src/views/footer/AppFooter.tsx) is a static stub.

---

## The VizRep geometry editor

Every meta object carries a `geometry` field: a string of JavaScript defining an
`async function vizRep(gc)` that draws the object in 3D. For most types the
General tab just shows that string in a textarea. For the three types the preview
pipeline understands — **`Class`, `RelationClass`, `Port`** — it instead shows the
*VizRep editor block*, ported from the sibling `mmar-vizrep-client-react`:

```
┌─ VizRepGeometryEditor ──────────────┐
│  CodeEditor      (Monaco, 300px)    │
│  PreviewButtons  (Preview + 2D/3D)  │
│  ThreeCanvas     (three.js, 400px)  │
└─────────────────────────────────────┘
```

### The pieces

| File | Role |
|---|---|
| [vizrep-editor/VizRepGeometryEditor.tsx](src/views/middle-body/general-tab/vizrep-editor/VizRepGeometryEditor.tsx) | The wrapper. Stacks the three children at fixed pixel heights and owns the load-on-selection effect. |
| [code-editor/CodeEditor.tsx](src/views/code-editor/CodeEditor.tsx) | Monaco, bound to `editorStore.codeEditorValue`. |
| [code-editor/monaco-setup.ts](src/views/code-editor/monaco-setup.ts) | Side-effect import that self-hosts Monaco and wires its web workers through Vite (`?worker`). No CDN. |
| [code-editor/gc-intellisense.ts](src/views/code-editor/gc-intellisense.ts) | The `gc` extra-lib giving autocomplete for the `GraphicContext` API. Registered once per page. |
| [preview-buttons/PreviewButtons.tsx](src/views/preview-buttons/PreviewButtons.tsx) | The **Preview** button and the **2D/3D** toggle. |
| [preview-buttons/preview-pipeline.ts](src/views/preview-buttons/preview-pipeline.ts) | `runPreview()` / `previewSelectedObject()` / `clearPreview()`. |
| [three-canvas/ThreeCanvas.tsx](src/views/three-canvas/ThreeCanvas.tsx) | Mounts the singleton three.js engine into a container div. |
| [src/engine/](src/engine/) | 19 files: the three.js renderer, scene, cameras, orbit controls and draw helpers. Module singletons behind an `engine` facade. |

### Event choreography

These components do **not** talk through props. They talk over
[event-bus.ts](src/resources/services/event-bus.ts), a tiny typed publish/subscribe
shim carried over from the Aurelia original (`subscribe` returns a disposable, so
React effects can clean up). Three flows matter:

**1. You select an object** → `VizRepGeometryEditor`'s effect (keyed on
`selectedObject?.uuid`, *not* the whole object, so unrelated `revision` bumps
don't re-fire it) copies `geometry` into the editor buffer and publishes **two**
events:
- `changeCodeEditorCode` → `CodeEditor` beautifies **the buffer only** —
  selecting an object must never mark it as edited (D8).
- `previewSelectedObject` → `PreviewButtons` calls `previewSelectedObject()`,
  which draws the newly selected object into the canvas. Without this the canvas
  only ever changed when you clicked Preview, leaving the *previous* object's
  render sitting under the new object's name.

**2. You type** → Monaco's `onChange` writes the value to *both* `editorStore`
**and** `selectedObject.geometry` (via `updateSelectedField`). This is the
**live-commit** rule (D2): Save always persists exactly what the editor shows, so
there is no "edited but never previewed → stale save" trap. It does not cause a
cursor jump, because `@monaco-editor/react` skips `setValue` when the incoming
`value` already equals the model's content.

**3. You click Preview** →
```
PreviewButtons  ──publish("previewButtonClicked")──▶  CodeEditor
                                                        │ flushes buffer onto object.geometry
                                                        ▼
                                              publish("updatedGeometryValue")
                                                        │
PreviewButtons ◀────────────────────────────────────────┘
   └─▶ runPreview(): compile geometry → reset engine → build mock SceneInstance
                    → create the Class/RelationClass/Port instance → draw
```

Note the asymmetry between flows 1 and 3: the **Preview button flushes the
(beautified) buffer onto the object**; the **selection path does not** — it reads
geometry straight off the object, so selecting cannot dirty it.

Three rules learned the hard way here:

- **Compile before you reset.** `runPreview()` parses the geometry *before* it
  touches engine state. Because of live-commit, a half-typed snippet is the normal
  state of the buffer; if the engine were reset first, one bad keystroke would both
  throw *and* wipe the last good render. Invalid geometry now logs an error and
  leaves the canvas alone. (The selection path calls `clearPreview()` explicitly
  when the new object has no geometry — otherwise "leave the canvas alone" would
  strand the *previous* object's render on screen.)
- **Never subscribe to the bus with an `async` callback.** `publish()` calls each
  listener synchronously and throws away the returned promise, so a rejection would
  vanish as an unhandled rejection instead of a log line. Use
  `() => void thing().catch(log)`.
- **Serialize the builds.** Every step of `runPreview` is async, so clicking three
  cards in a row would interleave three builds over the one shared `globalObject`
  and the last to *finish* would win — not the last clicked. `previewSelectedObject()`
  guards with a monotonic `generation` counter (a superseded build drops out at its
  next `await`) plus a `queue` promise (never two builds at once), and it reads the
  selection at draw time rather than taking it as an argument, so a queued build
  picks up the newest object.

### Type dispatch: `type`, never `instanceof`

`runPreview()` decides what to build by reading the store's `type` discriminator
(`"Class"` / `"RelationClass"` / `"Port"`) — the same signal `GeneralTab` uses to
decide whether to render the block at all, so the two can never disagree.

It is tempting to write `selected instanceof Class`, and the vizrep client does
exactly that. **It does not work here.** That client's backend service revives every
response into a gds class (`data.map(Class.fromJS)`); this client's
`backendService.fetchData()` pushes the raw parsed JSON straight into the store, and
only `SceneType` and `SceneInstance` are ever run through `fromJS`. So the objects in
`selectedObjectStore` are plain objects whose prototype is `Object.prototype`, and
every `instanceof` check silently falls through — which is exactly how the preview
once managed to draw nothing at all, for all three types.

### Engine lifecycle

The engine is a **page-lifetime singleton** — one `WebGLRenderer`, one scene, one set
of cameras — but `ThreeCanvas` mounts and unmounts on *every* object, type and tab
switch. `engine.mount(container)` therefore has to be idempotent and
concurrency-safe:

- The expensive `initiator.init()` runs **once per page**, guarded by a memoized
  **promise** (not a boolean — a boolean set *after* `await init()` lets two racing
  mounts both run the heavy branch, which duplicates the mock scene type, the orbit
  controls and the window resize listener). A failed init resets the memo so a later
  mount can retry.
- Every mount then just **re-attaches** the existing `renderer.domElement` and
  restarts the render loop. The renderer is never recreated: browsers cap live WebGL
  contexts at ~16 and silently drop the oldest.
- `mount()` returns a monotonic **mount token**; `unmount(token)` is a no-op if a
  newer mount has taken ownership. `ThreeCanvas` defers its cleanup behind the
  in-flight mount promise, so init can't finish after unmount and leave an animation
  loop running on a detached canvas — and, because React StrictMode reuses the same
  container element, a stale cleanup can't detach the *newer* mount's canvas either
  (ownership cannot be decided by comparing elements).
- `engine.whenReady()` is the seam for everyone who *isn't* ThreeCanvas: callers
  hold no mount token but still must not touch engine state before init (the preview
  pipeline needs `globalObject.sceneTypes[0]`). It never rejects — a failed init
  leaves awaiters parked, which is correct, as there is nothing to draw into.
- A 1-second `setInterval` in `ThreeCanvas` sets `globalObject.render = true` and
  re-pins any relation line. The animator only draws when that flag is set, and some
  update paths (attribute edits via `vizrepUpdateChecker`) mutate meshes *without*
  setting it. **Keep the interval and its `clearInterval`** — an earlier port dropped
  it, assuming the `ResizeObserver` covered it, and attribute edits stopped reaching
  the canvas.
- `engine.setThreeDimensional(is3d)` swaps camera + orbit controls for the 2D/3D
  toggle. `mount()` re-applies the flag every time, because `initCamera()`
  unconditionally picks the 3D camera while `initOrbitControls()` honours the flag —
  so a toggle landing mid-init would otherwise leave 2D controls driving the 3D camera.

### Design decisions (D1–D12)

Locked during the vizrep→metamodeling integration. **This table is the record.**
(Earlier revisions of this guide deferred to "the aggregator's `plan.md`"; that
pointer is dead — `../plan.md` is now the *modeling*-client migration plan and
carries no D-rows.)

| # | Decision |
|---|---|
| D1 | Full block only for `Class` / `RelationClass` / `Port`; all other types keep a plain textarea. |
| D2 | Live commit — every Monaco change writes `selectedObject.geometry`. |
| D3 | No "Save to DB" button. The only save path is the top-bar Save / Ctrl+S. |
| D4 | The geometry slot sits after the Rotation fieldset, before the type-specific fields. |
| D5 | No AR **button** in the embedded canvas. (WebXR itself is still enabled — `mount()` calls `arInitiator.enableXR()`, and `engine.createARButton()` exists but has no callers.) |
| D6 | Monaco theme `vs-dark`. The canvas container renders on **`#ffffff`** — an earlier revision of this guide recorded `#1e1e1e`, which is not what the code does. |
| D7 | Fixed pixel heights (300 / 44 / 400) — percentages collapse inside the scrolling tab. The editor box is user-resizable; Monaco's `automaticLayout` picks the new height up. |
| D8 | Beautify-on-load touches the editor buffer only, never the object. |
| D9 | Dependency versions pinned to the vizrep client's (verified identical for `three`, `monaco-editor`, `@monaco-editor/react`, `js-beautify`, `troika-three-text`, `zustand`). |
| D10 | Monaco is self-hosted via `monaco-setup.ts`; no CDN. |
| D11 | The vizrep AttributeWindow is not ported — `updateAttributeGui` / `removeAttributeGui` are published with no listeners. |
| D12 | Dev-only test deps (`jsdom`, `@testing-library/react`) for the component suites. |

One later addition sits outside the table: **PreviewButtons also owns a 2D/3D
toggle**. Vizrep drives that from a toolbar this client does not have, so it lives
next to Preview — the one control row this feature owns.

---

## Gotchas

- **The document itself must never scroll — `html, body { overflow: hidden }` in
  the theme's `MuiCssBaseline` is load-bearing.** The shell is a fixed-viewport
  layout (`AppLayout` is `100vh`; the left nav, middle body and log window each
  scroll inside themselves), but nothing enforced that at the document level, so
  anything sticking out past the viewport grew the document's scroll area and
  flashed an app-wide scrollbar. The source is `Tooltip`: it is portalled into
  `<body>`, and although MUI renders it `position: fixed` at first, Popper.js
  overwrites that on its first update with its default `absolute` strategy plus a
  `transform` — and an absolutely positioned, transformed box *does* count towards
  document overflow. Popper's `preventOverflow` guards only the main axis by
  default, so the `placement="left"`/`"right"` tooltips on log entries and
  left-nav rows hang past the top/bottom edge; scrolling either list fast keeps
  opening and repositioning them under the moving cursor, which is when the
  flicker shows up. Two more pieces go with the clip: the theme turns on
  `preventOverflow.altAxis` so those tooltips are nudged back into view rather
  than silently clipped, and the three scroll panels set
  `overscroll-behavior: contain` so a fast flick that reaches the end of a list
  does not chain its leftover delta into the document.
- **Clicking a left-nav list row no longer saves the outgoing object** (it did
  until tabs landed). The old consequence — previewing an object and then navigating away
  rewrote its `geometry` with the beautified text — is gone with it. What is *not*
  gone: the Preview button still flushes the beautified buffer onto the object, so
  clicking Preview marks the tab dirty even if you typed nothing.
- **A full refresh discards every open tab, unsaved edits included.**
  `resetObjects()` swaps out the collections the working copies were cloned from,
  so keeping them would leave tabs pointing at objects that no longer exist. The
  **Refresh button guards this** — if any tab is dirty (`hasUnsavedTabs()`), the
  Toolbar confirms before firing the refresh; Cancel/Esc leave the tabs alone.
  The **login path does not** guard: it's a deliberate user-context reset with
  nothing worth preserving. A **real browser navigation** (reload / tab close) is
  guarded separately by AppLayout's `beforeunload` handler (same `hasUnsavedTabs()`
  check) — the store is memory-only, so a reload would drop every tab.
- **`geometry` is typed `Function`** on the gds `MetaObject` but holds a **string** at
  runtime. Read it with `?.toString()`, write it with an `as unknown as` cast. Don't
  "fix" gds — it is shared with the server.
- **`getIcon(geometry)` is a string scrape, not an evaluation.** It splits the
  geometry source on `let icon` / `let map` and fishes out the first `data:` base64
  literal, falling back to a hard-coded placeholder PNG. That is why every card can
  show a thumbnail without running any VizRep code — and why renaming that variable
  in a geometry snippet silently changes the icon.
- **`instanceof` against store objects always fails** — they are plain JSON. Branch on
  `type`. ([Details](#type-dispatch-type-never-instanceof).)
- **The left-nav list lags the General tab by design** — `selectedObject` is a working
  copy; the card catches up on save.
- **In tests, `three`, `@monaco-editor/react` and `monaco-setup` must be mocked.**
  `three` builds a `WebGLRenderer` at module scope and needs a real WebGL context.

---

## Build-time glue worth knowing

[vite.config.ts](vite.config.ts) sets up two path aliases (mirrored in
[tsconfig.json](tsconfig.json), which needs its own copy — Vite and `tsc` do not
share resolution):

- `@` → `src` (so `@/resources/...` instead of `../../..`).
- `@gds` → the sibling `../mmar-global-data-structure` repo — the shared DTOs are
  consumed **directly from source**, not npm-installed or copied.

It also **stubs out `jsonwebtoken`** (a Node-only library the shared `User` class
imports for server-side signing) so it does not crash the browser bundle — see
[src/stubs/jsonwebtoken.ts](src/stubs/jsonwebtoken.ts). The stub needs *two*
mechanisms: `resolve.alias` to redirect the import, **and** `optimizeDeps.exclude`
so esbuild's dep pre-bundler doesn't grab the real package before the alias can
apply. This kind of "shared code assumes Node, but we are in a browser" friction is
common when sharing models between server and client.

Config is read in exactly one place, [src/config.ts](src/config.ts) — services must
import `API_URL` from there and never touch `import.meta.env` directly. Vite loads
`.env` always and `.env.development` on top of it in dev, so `npm run dev` targets
`http://localhost:8000` (the browser runs on the host) while a production build
falls back to `.env`'s `http://mmar-server:8000` (the in-container hostname).

## Tests

`npm run test` → **168 tests across 18 files**, all green. Vitest defaults to the
`node` environment; the component suites opt into jsdom per-file with a
`// @vitest-environment jsdom` docblock — cheaper than a global switch, and it keeps
the blast radius small. [src/test-setup.ts](src/test-setup.ts) imports
`reflect-metadata` first, mirroring `main.tsx`.

The suites worth reading before you change anything in the VizRep feature are
[engine-lifecycle.test.ts](src/engine/engine-lifecycle.test.ts) (12 tests pinning the
mount/unmount contract above) and
[preview-pipeline.test.ts](src/views/preview-buttons/preview-pipeline.test.ts)
(19 tests pinning the compile-before-reset and generation/queue behavior). They exist
because each of those rules was a bug first.

For the tab strip the pair is
[selectedObjectStore.test.ts](src/resources/store/selectedObjectStore.test.ts)
(12 tests on open/focus/close/dirty, including "an edit survives switching away and
back") and
[ObjectTabs.test.tsx](src/views/object-tabs/ObjectTabs.test.tsx) (10 tests on the
circle, the prompt, and the dismiss-does-nothing rule).

Undo/redo is pinned in four places: the same store suite (12 more tests — the
deep-clone requirement, coalescing, the per-tab split, the `dirty` round trip and
the geometry mirror), [Toolbar.test.tsx](src/views/toolbar/Toolbar.test.tsx) (the
arrows' enabled state follows the *active* tab) and
[AppLayout.test.tsx](src/views/layout/AppLayout.test.tsx) (the shortcuts, including
the no-double-step rule for events out of Monaco). The editor's own takeover of
those chords is pinned in
[CodeEditor.test.tsx](src/views/code-editor/CodeEditor.test.tsx), and the
Ctrl-vs-⌘ split in [platform.test.ts](src/resources/util/platform.test.ts) plus a
macOS block in the AppLayout suite.

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
changes; handlers and services write state back**," the rest of the file structure
is just regions of UI hanging off that loop.
