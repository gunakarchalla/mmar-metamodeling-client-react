// @vitest-environment jsdom
//
// The browser-level unsaved-changes guard: a real page navigation (reload / tab
// close) tears down the memory-only store, so AppLayout arms a `beforeunload`
// handler that cancels the event only while some open tab is dirty. Children are
// stubbed so this exercises AppLayout's window wiring in isolation.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { SceneType } from "@gds";

vi.mock("@/views/top-nav-bar/TopNavBar", () => ({ default: () => null }));
vi.mock("@/views/toolbar/Toolbar", () => ({ default: () => null }));
vi.mock("@/views/footer/AppFooter", () => ({ default: () => null }));
vi.mock("@/views/main-body/MainBody", () => ({ default: () => null }));
vi.mock("@/views/auth/SignInDialog", () => ({ default: () => null }));
vi.mock("@/views/common/AppSnackbar", () => ({ default: () => null }));
const { saveSelectedObject } = vi.hoisted(() => ({ saveSelectedObject: vi.fn() }));
vi.mock("@/resources/services/backend-service", () => ({
  backendService: { saveSelectedObject },
}));

import AppLayout from "./AppLayout";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";

const store = () => useSelectedObjectStore.getState();

// Dispatch a cancelable beforeunload and report whether a handler cancelled it.
function fireBeforeUnload() {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

beforeEach(() => store().resetObjects());
afterEach(cleanup);

describe("AppLayout beforeunload guard", () => {
  it("does not block navigation when no tab is dirty", () => {
    store().setObjects([SceneType.fromJS({ uuid: "st-1", name: "A" }) as SceneType], "SceneType");
    store().setSelectedObject("st-1");
    render(<AppLayout />);

    expect(fireBeforeUnload()).toBe(false);
  });

  it("blocks navigation while a tab has unsaved changes", () => {
    store().setObjects([SceneType.fromJS({ uuid: "st-1", name: "A" }) as SceneType], "SceneType");
    store().setSelectedObject("st-1");
    store().updateSelectedField("name", "edited");
    render(<AppLayout />);

    expect(fireBeforeUnload()).toBe(true);
  });

  it("stops blocking once the edits are saved (tab marked clean)", () => {
    store().setObjects([SceneType.fromJS({ uuid: "st-1", name: "A" }) as SceneType], "SceneType");
    store().setSelectedObject("st-1");
    store().updateSelectedField("name", "edited");
    render(<AppLayout />);
    expect(fireBeforeUnload()).toBe(true);

    store().markTabClean("st-1");
    expect(fireBeforeUnload()).toBe(false);
  });

  it("removes the listener on unmount", () => {
    store().setObjects([SceneType.fromJS({ uuid: "st-1", name: "A" }) as SceneType], "SceneType");
    store().setSelectedObject("st-1");
    store().updateSelectedField("name", "edited");
    const { unmount } = render(<AppLayout />);
    unmount();

    expect(fireBeforeUnload()).toBe(false);
  });
});

describe("AppLayout undo/redo shortcuts", () => {
  // Dispatch on the given element so the Monaco skip can be exercised. Defaults
  // to the Ctrl chord; jsdom's user agent is not a Mac, so that is the live one.
  function press(key: string, init: KeyboardEventInit = {}, target: EventTarget = window) {
    target.dispatchEvent(
      new KeyboardEvent("keydown", { key, ctrlKey: true, bubbles: true, ...init }),
    );
  }

  beforeEach(() => {
    store().setObjects([SceneType.fromJS({ uuid: "st-1", name: "A" }) as SceneType], "SceneType");
    store().setSelectedObject("st-1");
    store().updateSelectedField("name", "edited");
  });

  it("Ctrl+Z undoes and Ctrl+Y redoes on the active tab", () => {
    render(<AppLayout />);

    press("z");
    expect(store().selectedObject?.name).toBe("A");
    press("y");
    expect(store().selectedObject?.name).toBe("edited");
  });

  it("Ctrl+Shift+Z redoes as well", () => {
    render(<AppLayout />);

    press("z");
    press("z", { shiftKey: true });
    expect(store().selectedObject?.name).toBe("edited");
  });

  it("does not double-step when Ctrl+Z comes from inside the code editor", () => {
    render(<AppLayout />);
    // CodeEditor binds the same chord to the same store action (Monaco stops
    // propagation on keys it resolves, so it has to). Were this handler to fire
    // as well, one press would undo twice.
    const monaco = document.createElement("div");
    monaco.className = "monaco-editor";
    const textarea = document.createElement("textarea");
    monaco.appendChild(textarea);
    document.body.appendChild(monaco);

    press("z", {}, textarea);
    expect(store().selectedObject?.name).toBe("edited");
    monaco.remove();
  });

  it("removes the listener on unmount", () => {
    const { unmount } = render(<AppLayout />);
    unmount();

    press("z");
    expect(store().selectedObject?.name).toBe("edited");
  });

  it("ignores Alt+Ctrl+Z, which is a different chord", () => {
    render(<AppLayout />);

    press("z", { altKey: true });
    expect(store().selectedObject?.name).toBe("edited");
  });
});

// On a Mac the command modifier is ⌘, not Ctrl — and Ctrl must NOT stand in for
// it, or Ctrl+Z (a Mac-native "nothing") would silently undo.
describe("AppLayout shortcuts on macOS", () => {
  const realUserAgent = navigator.userAgent;
  const setUserAgent = (value: string) =>
    Object.defineProperty(window.navigator, "userAgent", { value, configurable: true });

  function press(key: string, init: KeyboardEventInit = {}) {
    window.dispatchEvent(new KeyboardEvent("keydown", { key, metaKey: true, ...init }));
  }

  beforeEach(() => {
    saveSelectedObject.mockClear();
    setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36");
    store().setObjects([SceneType.fromJS({ uuid: "st-1", name: "A" }) as SceneType], "SceneType");
    store().setSelectedObject("st-1");
    store().updateSelectedField("name", "edited");
  });

  afterEach(() => setUserAgent(realUserAgent));

  it("Cmd+Z undoes, Cmd+Shift+Z and Cmd+Y redo", () => {
    render(<AppLayout />);

    press("z");
    expect(store().selectedObject?.name).toBe("A");
    // Shift uppercases event.key, which is why the handler lower-cases it
    press("Z", { shiftKey: true });
    expect(store().selectedObject?.name).toBe("edited");

    press("z");
    press("y");
    expect(store().selectedObject?.name).toBe("edited");
  });

  it("does not accept Ctrl+Z on a Mac", () => {
    render(<AppLayout />);

    press("z", { metaKey: false, ctrlKey: true });
    expect(store().selectedObject?.name).toBe("edited");
  });

  it("Cmd+S saves", () => {
    render(<AppLayout />);

    press("s");
    expect(saveSelectedObject).toHaveBeenCalledTimes(1);
  });
});
