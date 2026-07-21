// @vitest-environment jsdom
//
// Two toolbar behaviours:
//   - the Refresh button's guard: a full refresh discards every open tab, so when
//     a tab has unsaved changes it must confirm first, and dismissing that confirm
//     must leave everything untouched (no refresh fired);
//   - the undo/redo arrows, which step the *active tab's* history and are enabled
//     strictly by what that tab has left to undo/redo.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { SceneType } from "@gds";

vi.mock("@/resources/services/backend-service", () => ({
  backendService: { saveSelectedObject: vi.fn().mockResolvedValue({}) },
}));

import Toolbar from "./Toolbar";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { useUiStore } from "@/resources/store/uiStore";

const store = () => useSelectedObjectStore.getState();
const refreshBtn = () => screen.getByRole("button", { name: "refresh" });
const undoBtn = () => screen.getByRole("button", { name: "undo" }) as HTMLButtonElement;
const redoBtn = () => screen.getByRole("button", { name: "redo" }) as HTMLButtonElement;

function openTwo() {
  store().setSceneTypes([
    SceneType.fromJS({ uuid: "st-1", name: "Alpha" }) as SceneType,
    SceneType.fromJS({ uuid: "st-2", name: "Beta" }) as SceneType,
  ]);
  store().setSelectedObject("st-1");
  store().setSelectedObject("st-2");
}

beforeEach(() => {
  store().resetObjects();
  useUiStore.setState({ refreshNonce: 0, refreshType: undefined });
});

afterEach(cleanup);

describe("Toolbar refresh guard", () => {
  it("refreshes immediately when no tab is dirty", () => {
    openTwo();
    render(<Toolbar />);
    fireEvent.click(refreshBtn());

    expect(screen.queryByText("Discard unsaved changes?")).toBeNull();
    expect(useUiStore.getState().refreshType).toBe("Refresh button");
    expect(useUiStore.getState().refreshNonce).toBe(1);
  });

  it("confirms first when a tab has unsaved changes", () => {
    openTwo();
    store().updateSelectedField("name", "Beta edited");
    render(<Toolbar />);
    fireEvent.click(refreshBtn());

    expect(screen.getByText("Discard unsaved changes?")).toBeTruthy();
    // nothing refreshed yet
    expect(useUiStore.getState().refreshNonce).toBe(0);
  });

  it("'Refresh and discard' fires the full refresh", () => {
    openTwo();
    store().updateSelectedField("name", "Beta edited");
    render(<Toolbar />);
    fireEvent.click(refreshBtn());
    fireEvent.click(screen.getByRole("button", { name: "Refresh and discard" }));

    expect(useUiStore.getState().refreshType).toBe("Refresh button");
    expect(useUiStore.getState().refreshNonce).toBe(1);
  });

  it("Cancel dismisses the dialog without refreshing", async () => {
    openTwo();
    store().updateSelectedField("name", "Beta edited");
    render(<Toolbar />);
    fireEvent.click(refreshBtn());
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() =>
      expect(screen.queryByText("Discard unsaved changes?")).toBeNull(),
    );
    expect(useUiStore.getState().refreshNonce).toBe(0);
    expect(store().openTabs).toHaveLength(2);
  });
});

describe("Toolbar undo/redo", () => {
  it("keeps both arrows disabled with nothing open", () => {
    render(<Toolbar />);
    expect(undoBtn().disabled).toBe(true);
    expect(redoBtn().disabled).toBe(true);
  });

  it("enables undo once the active tab has an edit, and reverts it", () => {
    openTwo();
    render(<Toolbar />);
    expect(undoBtn().disabled).toBe(true);

    // act(): the store is mutated from outside React here, so the toolbar's
    // re-render has to be flushed before the buttons are asserted on.
    act(() => store().updateSelectedField("name", "Beta edited"));
    expect(undoBtn().disabled).toBe(false);
    expect(redoBtn().disabled).toBe(true);

    fireEvent.click(undoBtn());
    expect(store().selectedObject?.name).toBe("Beta");
    expect(undoBtn().disabled).toBe(true);
    expect(redoBtn().disabled).toBe(false);

    fireEvent.click(redoBtn());
    expect(store().selectedObject?.name).toBe("Beta edited");
  });

  it("follows the active tab's own history when tabs are switched", () => {
    openTwo();
    store().updateSelectedField("name", "Beta edited");
    render(<Toolbar />);
    expect(undoBtn().disabled).toBe(false);

    // st-1 was never edited, so its tab has nothing to undo
    act(() => store().activateTab("st-1"));
    expect(undoBtn().disabled).toBe(true);
  });
});
