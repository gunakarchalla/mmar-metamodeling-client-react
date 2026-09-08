import { eventBus } from "./event-bus";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { DEFAULT_VIZREP_CODE, useEditorStore } from "@/resources/store/editorStore";
import { useLogStore } from "@/resources/store/logStore";

/**
 * Empties the application's stores when a user signs out, so the next one starts
 * from a blank app.
 *
 * WHY THIS EXISTS: signing out used to clear only the bearer token and
 * `authStore.currentUser`. Everything the session had built lives in
 * module-singleton zustand stores, which last as long as the PAGE, not as long
 * as the sign-in — and `AppLayout` merely stops rendering the body while nobody
 * is signed in, which destroys none of it. So the next sign-in re-rendered the
 * body over the previous user's session: their whole loaded metamodel was still
 * in `selectedObjectStore` (the admin-only user and usergroup lists included),
 * their editor tabs came back with their unsaved edits and undo histories, the
 * code editor still held their VizRep source, and the log panel still named the
 * objects they had opened and the operations they had run.
 *
 * WIRING: `authStore.logout()` publishes `login: false`, and the subscription at
 * the bottom of this file runs the teardown synchronously inside that publish —
 * before React re-renders and before any sign-in can succeed. The bus is what
 * keeps this module (and the stores it reaches into) out of `authStore`'s import
 * graph.
 *
 * THE ENGINE HALF IS SEPARATE, in `engine-reset.ts` alongside this file, and
 * subscribes to the same channel. It cannot be called from here: the engine's
 * module scope builds a `WebGLRenderer`, and it is deliberately behind the
 * lazily-loaded VizRep editor chunk, so importing it from a module `main.tsx`
 * pulls in would cost every visitor a three.js download and a WebGL context on
 * the sign-in screen. Splitting it is also exactly right — the engine holds
 * nothing to reset on a session that never loaded it.
 *
 * NOT RESET, deliberately: `uiStore`, whose only state is the refresh signal
 * that tells `LeftNav` to reload. `LeftNav` unmounts with the body on sign-out
 * and does a full reload on mount regardless of that signal, so there is nothing
 * of the previous session in it.
 *
 * WHY TWO STORES ARE EMPTIED WITH `setState` rather than a `reset()` action of
 * their own: `editorStore` and `logStore` are kept byte-identical with
 * `mmar-vizrep-client-react` (see the README), which has no sessions to tear
 * down — so the "back to initial state" payloads live here instead. They have to
 * stay in step with those stores' initial values by hand; both are small and
 * both are spelled out below rather than hidden behind a helper for that reason.
 */
export function resetSessionState(): void {
  // The metamodel itself, the editor tabs holding working copies of it and their
  // undo histories, and the selection — `resetObjects` empties every collection
  // and then closes every tab, the same path the Refresh button takes.
  useSelectedObjectStore.getState().resetObjects();

  // The code editor renders its buffer whether or not anything is selected, so
  // the previous user's VizRep source would otherwise stay on screen.
  // `readyForVizRepUpdate` is the live-preview lock: left held by a sign-out that
  // landed mid-update, the next session's preview would wait on it forever.
  useEditorStore.setState({
    codeEditorValue: DEFAULT_VIZREP_CODE,
    threeDimensional: true,
    selectedTab: 0,
    tabs: [],
    readyForVizRepUpdate: true,
  });

  // Last, so nothing logged by the teardown above survives it. The panel names
  // the objects the previous user opened and the operations they ran on them, so
  // it is their data as much as the object lists are.
  useLogStore.setState({
    logArray: [],
    snackbar: { open: false, message: "", severity: "info" },
  });
}

/**
 * Load-bearing module side effect: importing this file is what arms the
 * teardown. `main.tsx` imports it for exactly that reason — see the note there.
 */
eventBus.subscribe("login", (loggedIn) => {
  if (!loggedIn) resetSessionState();
});
