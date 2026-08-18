// @vitest-environment jsdom
//
// The wrapper's selection-load effect.
//
// Its dependency is `selectedObject?.uuid`, not the object — because D2 live-commit
// bumps `revision` and rerefs `selectedObject` on every keystroke. Keying on the object
// would reload (and re-beautify) the buffer mid-typing.
//
// The three children are stubbed: they pull in Monaco and three.js, neither of which
// belongs in this test's module graph.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { Class } from "@gds";

vi.mock("@/views/code-editor/CodeEditor", () => ({
  default: () => <div data-testid="code-editor" />,
}));
vi.mock("@/views/preview-buttons/PreviewButtons", () => ({
  default: () => <div data-testid="preview-buttons" />,
}));
vi.mock("@/views/three-canvas/ThreeCanvas", () => ({
  default: () => <div data-testid="three-canvas" />,
}));

import VizRepGeometryEditor from "./VizRepGeometryEditor";
import { useEditorStore } from "@/resources/store/editorStore";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { eventBus } from "@/resources/services/event-bus";

const buffer = () => useEditorStore.getState().codeEditorValue;

/** The shared data structures type `geometry` as a function; it holds a string. */
function makeClass(uuid: string, geometry?: string): Class {
  const cls = new Class(uuid, `Class-${uuid}`, false, false);
  if (geometry !== undefined) cls.geometry = geometry as unknown as typeof cls.geometry;
  return cls;
}

function select(obj: Class | null) {
  useSelectedObjectStore.setState({ selectedObject: obj, type: obj ? "Class" : null });
}

beforeEach(() => {
  vi.restoreAllMocks();
  useEditorStore.getState().setCode("");
  select(null);
});

afterEach(cleanup);

describe("VizRepGeometryEditor — layout", () => {
  it("stacks the editor, the preview buttons and the canvas", () => {
    select(makeClass("a", "code"));
    render(<VizRepGeometryEditor />);

    expect(screen.getByTestId("code-editor")).toBeDefined();
    expect(screen.getByTestId("preview-buttons")).toBeDefined();
    expect(screen.getByTestId("three-canvas")).toBeDefined();
  });
});

describe("VizRepGeometryEditor — load on selection", () => {
  it("loads the selected object's geometry into the buffer and asks for a beautify", () => {
    const publish = vi.spyOn(eventBus, "publish");
    select(makeClass("a", "function a(){return 1}"));

    render(<VizRepGeometryEditor />);

    expect(buffer()).toBe("function a(){return 1}");
    expect(publish).toHaveBeenCalledWith("changeCodeEditorCode");
  });

  it("clears the buffer when the selected object has no geometry", () => {
    useEditorStore.getState().setCode("stale content");
    select(makeClass("a"));

    render(<VizRepGeometryEditor />);

    expect(buffer()).toBe("");
  });

  it("reloads the buffer when a different object is selected", () => {
    select(makeClass("a", "first"));
    render(<VizRepGeometryEditor />);
    expect(buffer()).toBe("first");

    // act() flushes the zustand-driven re-render and the effect it schedules; without
    // it the negative test below would pass vacuously.
    act(() => select(makeClass("b", "second")));

    expect(buffer()).toBe("second");
  });

  it("asks for a redraw on the first selection and on every switch", () => {
    const publish = vi.spyOn(eventBus, "publish");
    select(makeClass("a", "first"));
    render(<VizRepGeometryEditor />);
    expect(publish).toHaveBeenCalledWith("previewSelectedObject");

    publish.mockClear();
    act(() => select(makeClass("b", "second")));
    // Without this the canvas keeps rendering object "a" while every other field shows "b".
    expect(publish).toHaveBeenCalledWith("previewSelectedObject");
  });

  it("does NOT reload while typing — a revision bump on the same uuid is ignored", () => {
    // D2 rerefs selectedObject on every keystroke. If the effect keyed on the object
    // it would fire here, overwrite the buffer with the committed value and re-beautify
    // mid-word.
    select(makeClass("a", "original"));
    render(<VizRepGeometryEditor />);

    const publish = vi.spyOn(eventBus, "publish");
    // Same uuid, new identity + new geometry: exactly what updateSelectedField produces.
    act(() => select(makeClass("a", "user is typing…")));

    expect(buffer()).toBe("original");
    expect(publish).not.toHaveBeenCalledWith("changeCodeEditorCode");
  });
});
