// @vitest-environment jsdom
//
// PreviewButtons owns the feature's only control row: the Preview action and the
// 2D/3D toggle. The toggle has to keep two mirrors in step — editorStore (what
// React renders) and the engine (which camera + orbit controls actually draw) —
// so both are asserted on every flip.
//
// `@/engine` is mocked: importing it for real constructs a WebGLRenderer at module
// scope, which jsdom cannot provide.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";

/** No jest-dom in this project (see test-setup.ts), so read the DOM directly. */
const toggle = () =>
  screen.getByRole("switch", { name: "toggle 2D / 3D preview" }) as HTMLInputElement;

const mocks = vi.hoisted(() => ({
  engine: { setThreeDimensional: vi.fn() },
  runPreview: vi.fn(() => Promise.resolve()),
  previewSelectedObject: vi.fn(() => Promise.resolve()),
  logger: { log: vi.fn() },
}));

vi.mock("@/engine", () => ({ engine: mocks.engine }));
vi.mock("@/views/preview-buttons/preview-pipeline", () => ({
  runPreview: mocks.runPreview,
  previewSelectedObject: mocks.previewSelectedObject,
}));
vi.mock("@/resources/services/logger", () => ({ logger: mocks.logger }));

import PreviewButtons from "./PreviewButtons";
import { eventBus } from "@/resources/services/event-bus";
import { useEditorStore } from "@/resources/store/editorStore";

beforeEach(() => {
  vi.clearAllMocks();
  useEditorStore.setState({ threeDimensional: true });
});

afterEach(cleanup);

describe("PreviewButtons", () => {
  it("publishes previewButtonClicked when Preview is pressed", () => {
    render(<PreviewButtons />);
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    // The pipeline runs off updatedGeometryValue (published by CodeEditor), not off
    // the click, so the click alone must not have drawn anything yet.
    expect(mocks.runPreview).not.toHaveBeenCalled();
  });

  it("runs the preview pipeline on updatedGeometryValue", async () => {
    render(<PreviewButtons />);
    await act(async () => {
      eventBus.publish("updatedGeometryValue");
    });
    expect(mocks.runPreview).toHaveBeenCalledTimes(1);
  });

  it("logs instead of rejecting when the pipeline throws", async () => {
    mocks.runPreview.mockRejectedValueOnce(new Error("bad geometry"));
    render(<PreviewButtons />);
    await act(async () => {
      eventBus.publish("updatedGeometryValue");
    });
    expect(mocks.logger.log).toHaveBeenCalledWith(expect.stringContaining("bad geometry"), "error");
  });

  it("redraws the canvas when the selection changes", async () => {
    render(<PreviewButtons />);
    await act(async () => {
      eventBus.publish("previewSelectedObject");
    });
    expect(mocks.previewSelectedObject).toHaveBeenCalledTimes(1);
    // The selection path must not go through the Preview button's flush, which would
    // write the beautified buffer back onto the object (D8: selecting must not dirty).
    expect(mocks.runPreview).not.toHaveBeenCalled();
  });

  it("logs instead of rejecting when a selection-driven redraw throws", async () => {
    mocks.previewSelectedObject.mockRejectedValueOnce(new Error("no scene type"));
    render(<PreviewButtons />);
    await act(async () => {
      eventBus.publish("previewSelectedObject");
    });
    expect(mocks.logger.log).toHaveBeenCalledWith(expect.stringContaining("no scene type"), "error");
  });

  it("stops redrawing on selection once unmounted", async () => {
    const { unmount } = render(<PreviewButtons />);
    unmount();
    await act(async () => {
      eventBus.publish("previewSelectedObject");
    });
    expect(mocks.previewSelectedObject).not.toHaveBeenCalled();
  });

  it("starts in 3D, matching the engine default", () => {
    render(<PreviewButtons />);
    expect(toggle().checked).toBe(true);
    expect(screen.getByText("3D")).toBeTruthy();
  });

  it("switches the store and the engine to 2D when toggled off", () => {
    render(<PreviewButtons />);
    fireEvent.click(toggle());

    expect(useEditorStore.getState().threeDimensional).toBe(false);
    expect(mocks.engine.setThreeDimensional).toHaveBeenCalledWith(false);
    expect(toggle().checked).toBe(false);
    expect(screen.getByText("2D")).toBeTruthy();
  });

  it("switches back to 3D on a second toggle", () => {
    render(<PreviewButtons />);
    fireEvent.click(toggle());
    fireEvent.click(toggle());

    expect(useEditorStore.getState().threeDimensional).toBe(true);
    expect(mocks.engine.setThreeDimensional).toHaveBeenNthCalledWith(2, true);
    expect(toggle().checked).toBe(true);
  });

  it("reflects the store when the editor re-opens in 2D", () => {
    // ThreeCanvas/PreviewButtons remount on every object switch, but editorStore
    // outlives them — a remount must not silently snap the label back to 3D.
    useEditorStore.setState({ threeDimensional: false });
    render(<PreviewButtons />);
    expect(toggle().checked).toBe(false);
    expect(screen.getByText("2D")).toBeTruthy();
  });
});
