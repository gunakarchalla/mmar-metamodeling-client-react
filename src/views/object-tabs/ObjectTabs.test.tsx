// @vitest-environment jsdom
//
// The tab strip's three user-visible contracts: a dirty tab shows a coloured
// circle instead of the ✕, closing a dirty tab must ask first, and dismissing
// that prompt must do nothing at all (tab stays open, nothing saved).
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { SceneType } from "@gds";

vi.mock("@/resources/services/backend-service", () => ({
  backendService: { saveObject: vi.fn().mockResolvedValue({}) },
}));

import ObjectTabs from "./ObjectTabs";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { backendService } from "@/resources/services/backend-service";

const store = () => useSelectedObjectStore.getState();

function openTwo() {
  store().setObjects([
    SceneType.fromJS({ uuid: "st-1", name: "Alpha" }) as SceneType,
    SceneType.fromJS({ uuid: "st-2", name: "Beta" }) as SceneType,
  ], "SceneType");
  store().setSelectedObject("st-1");
  store().setSelectedObject("st-2");
}

const closeButton = (name: string) => screen.getByRole("button", { name: `close ${name}` });
const dot = () => document.querySelector(".unsaved-indicator");

beforeEach(() => {
  vi.clearAllMocks();
  store().resetObjects();
});

afterEach(cleanup);

describe("ObjectTabs", () => {
  it("renders nothing when no object is open", () => {
    const { container } = render(<ObjectTabs />);
    expect(container.firstChild).toBeNull();
  });

  it("renders one tab per open object", () => {
    openTwo();
    render(<ObjectTabs />);
    expect(screen.getByText("Alpha")).toBeTruthy();
    expect(screen.getByText("Beta")).toBeTruthy();
  });

  it("clicking a tab activates it", () => {
    openTwo();
    render(<ObjectTabs />);
    fireEvent.click(screen.getByText("Alpha"));
    expect(store().activeTabUuid).toBe("st-1");
  });

  it("shows the unsaved circle only for a dirty tab", () => {
    openTwo();
    const { rerender } = render(<ObjectTabs />);
    expect(dot()).toBeNull();

    store().updateSelectedField("name", "Beta edited");
    rerender(<ObjectTabs />);
    expect(dot()).not.toBeNull();
  });

  it("closes a clean tab immediately, without prompting", () => {
    openTwo();
    render(<ObjectTabs />);
    fireEvent.click(closeButton("Alpha"));

    expect(store().openTabs.map((t) => t.uuid)).toEqual(["st-2"]);
    expect(screen.queryByText("Unsaved changes")).toBeNull();
  });

  it("prompts instead of closing when the tab is dirty", () => {
    openTwo();
    store().updateSelectedField("name", "Beta edited");
    render(<ObjectTabs />);
    fireEvent.click(closeButton("Beta edited"));

    expect(screen.getByText("Unsaved changes")).toBeTruthy();
    expect(store().openTabs).toHaveLength(2);
  });

  it("'Discard changes' closes the tab without saving", () => {
    openTwo();
    store().updateSelectedField("name", "Beta edited");
    render(<ObjectTabs />);
    fireEvent.click(closeButton("Beta edited"));
    fireEvent.click(screen.getByText("Discard changes"));

    expect(store().openTabs.map((t) => t.uuid)).toEqual(["st-1"]);
    expect(backendService.saveObject).not.toHaveBeenCalled();
  });

  it("'Save changes' persists the tab's working copy, then closes it", async () => {
    openTwo();
    store().updateSelectedField("name", "Beta edited");
    render(<ObjectTabs />);
    fireEvent.click(closeButton("Beta edited"));
    fireEvent.click(screen.getByText("Save changes"));

    await waitFor(() => expect(store().openTabs.map((t) => t.uuid)).toEqual(["st-1"]));
    expect(backendService.saveObject).toHaveBeenCalledWith(
      expect.objectContaining({ uuid: "st-2", name: "Beta edited" }),
      "SceneType",
    );
  });

  it("dismissing the prompt does nothing — the tab stays open and dirty", async () => {
    openTwo();
    store().updateSelectedField("name", "Beta edited");
    render(<ObjectTabs />);
    fireEvent.click(closeButton("Beta edited"));

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape", code: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(store().openTabs).toHaveLength(2);
    expect(store().getTab("st-2")?.dirty).toBe(true);
    expect(backendService.saveObject).not.toHaveBeenCalled();
  });

  it("can close a background tab while a dirty tab stays open", () => {
    openTwo();
    store().updateSelectedField("name", "Beta edited");
    render(<ObjectTabs />);
    fireEvent.click(closeButton("Alpha"));

    expect(store().openTabs.map((t) => t.uuid)).toEqual(["st-2"]);
    expect(store().activeTabUuid).toBe("st-2");
  });
});
