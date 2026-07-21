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
vi.mock("@/views/auth/SignInSignUpDialog", () => ({ default: () => null }));
vi.mock("@/views/common/AppSnackbar", () => ({ default: () => null }));
vi.mock("@/resources/services/backend-service", () => ({ backendService: {} }));

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
    store().setSceneTypes([SceneType.fromJS({ uuid: "st-1", name: "A" }) as SceneType]);
    store().setSelectedObject("st-1");
    render(<AppLayout />);

    expect(fireBeforeUnload()).toBe(false);
  });

  it("blocks navigation while a tab has unsaved changes", () => {
    store().setSceneTypes([SceneType.fromJS({ uuid: "st-1", name: "A" }) as SceneType]);
    store().setSelectedObject("st-1");
    store().updateSelectedField("name", "edited");
    render(<AppLayout />);

    expect(fireBeforeUnload()).toBe(true);
  });

  it("stops blocking once the edits are saved (tab marked clean)", () => {
    store().setSceneTypes([SceneType.fromJS({ uuid: "st-1", name: "A" }) as SceneType]);
    store().setSelectedObject("st-1");
    store().updateSelectedField("name", "edited");
    render(<AppLayout />);
    expect(fireBeforeUnload()).toBe(true);

    store().markTabClean("st-1");
    expect(fireBeforeUnload()).toBe(false);
  });

  it("removes the listener on unmount", () => {
    store().setSceneTypes([SceneType.fromJS({ uuid: "st-1", name: "A" }) as SceneType]);
    store().setSelectedObject("st-1");
    store().updateSelectedField("name", "edited");
    const { unmount } = render(<AppLayout />);
    unmount();

    expect(fireBeforeUnload()).toBe(false);
  });
});
