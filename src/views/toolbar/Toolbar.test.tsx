// @vitest-environment jsdom
//
// The Refresh button's guard: a full refresh discards every open tab, so when a
// tab has unsaved changes it must confirm first, and dismissing that confirm
// must leave everything untouched (no refresh fired).
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { SceneType } from "@gds";

vi.mock("@/resources/services/backend-service", () => ({
  backendService: { saveSelectedObject: vi.fn().mockResolvedValue({}) },
}));

import Toolbar from "./Toolbar";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { useUiStore } from "@/resources/store/uiStore";

const store = () => useSelectedObjectStore.getState();
const refreshBtn = () => screen.getByRole("button", { name: "refresh" });

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
