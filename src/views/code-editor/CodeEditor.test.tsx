// @vitest-environment jsdom
//
// Monaco itself is replaced by a plain <textarea>: this
// suite is about the three data paths around the editor, not about Monaco painting.
//   - D2 live commit: every change writes both the buffer and selectedObject.geometry,
//     so Save / Ctrl+S always persists what the editor shows.
//   - D8 beautify-on-load: `changeCodeEditorCode` touches the buffer ONLY. Selecting an
//     object must not mark it changed.
//   - the `previewButtonClicked` -> `updatedGeometryValue` handshake.
//   - the undo/redo keybindings the editor takes over from Monaco, so the geometry
//     field steps the tab's history like every other bound field.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  selectedObject: { geometry: "" as unknown },
  updateSelectedField: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
  beforeMountSpy: vi.fn(),
  onMountSpy: vi.fn(),
}));

// Side-effect import that wires Monaco's ?worker bundles — irrelevant (and unloadable)
// under jsdom.
vi.mock("@/views/code-editor/monaco-setup", () => ({}));

// Stand-in for @monaco-editor/react: a controlled textarea with the same
// value/onChange/beforeMount contract.
vi.mock("@monaco-editor/react", () => ({
  default: ({
    value,
    onChange,
    beforeMount,
    onMount,
  }: {
    value: string;
    onChange: (v: string | undefined) => void;
    beforeMount: (monaco: unknown) => void;
    onMount: (editor: unknown, monaco: unknown) => void;
  }) => {
    mocks.beforeMountSpy(beforeMount);
    mocks.onMountSpy(onMount);
    return (
      <textarea
        data-testid="monaco"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  },
}));

vi.mock("@/resources/store/selectedObjectStore", () => ({
  useSelectedObjectStore: {
    getState: () => ({
      getSelectedObject: () => mocks.selectedObject,
      updateSelectedField: mocks.updateSelectedField,
      undo: mocks.undo,
      redo: mocks.redo,
    }),
  },
}));

import CodeEditor from "./CodeEditor";
import { useEditorStore } from "@/resources/store/editorStore";
import { eventBus } from "@/resources/services/event-bus";

const buffer = () => useEditorStore.getState().codeEditorValue;

beforeEach(() => {
  vi.clearAllMocks();
  useEditorStore.getState().setCode("");
  mocks.selectedObject = { geometry: "" };
});

afterEach(cleanup);

describe("CodeEditor — D2 live commit", () => {
  it("writes each change to both the editor buffer and selectedObject.geometry", () => {
    render(<CodeEditor />);

    fireEvent.change(screen.getByTestId("monaco"), { target: { value: "const a = 1;" } });

    expect(buffer()).toBe("const a = 1;");
    expect(mocks.updateSelectedField).toHaveBeenCalledWith("geometry", "const a = 1;");
  });

  it("commits an emptied editor as an empty string rather than undefined", () => {
    useEditorStore.getState().setCode("x");
    render(<CodeEditor />);

    fireEvent.change(screen.getByTestId("monaco"), { target: { value: "" } });

    expect(buffer()).toBe("");
    expect(mocks.updateSelectedField).toHaveBeenCalledWith("geometry", "");
  });
});

describe("CodeEditor — D8 beautify touches the buffer only", () => {
  it("beautifies the buffer on changeCodeEditorCode without dirtying the object", () => {
    useEditorStore.getState().setCode("function a(){return 1}");
    render(<CodeEditor />);

    eventBus.publish("changeCodeEditorCode");

    // js-beautify re-indents onto multiple lines...
    expect(buffer()).toContain("\n");
    expect(buffer()).not.toBe("function a(){return 1}");
    // ...but selecting an object must never mark it changed.
    expect(mocks.updateSelectedField).not.toHaveBeenCalled();
  });

  it("leaves an empty buffer alone", () => {
    render(<CodeEditor />);

    eventBus.publish("changeCodeEditorCode");

    expect(buffer()).toBe("");
    expect(mocks.updateSelectedField).not.toHaveBeenCalled();
  });

  it("unsubscribes on unmount so a stale editor cannot rewrite the buffer", () => {
    const { unmount } = render(<CodeEditor />);
    useEditorStore.getState().setCode("function a(){return 1}");

    unmount();
    eventBus.publish("changeCodeEditorCode");

    expect(buffer()).toBe("function a(){return 1}");
  });
});

describe("CodeEditor — preview handshake", () => {
  it("flushes the buffer onto geometry and republishes updatedGeometryValue", () => {
    const onUpdated = vi.fn();
    const sub = eventBus.subscribe("updatedGeometryValue", onUpdated);
    useEditorStore.getState().setCode("(gc) => gc");
    render(<CodeEditor />);

    eventBus.publish("previewButtonClicked");

    expect(mocks.selectedObject.geometry).toBe("(gc) => gc");
    expect(onUpdated).toHaveBeenCalledTimes(1);
    sub.dispose();
  });

  it("still signals the pipeline when nothing is selected", () => {
    const onUpdated = vi.fn();
    const sub = eventBus.subscribe("updatedGeometryValue", onUpdated);
    mocks.selectedObject = null as unknown as { geometry: unknown };
    render(<CodeEditor />);

    // runPreview() is what reports "No object selected"; the editor must not throw.
    expect(() => eventBus.publish("previewButtonClicked")).not.toThrow();
    expect(onUpdated).toHaveBeenCalledTimes(1);
    sub.dispose();
  });
});

describe("CodeEditor — IntelliSense registration", () => {
  it("registers the gc extra-lib only once across remounts (Monaco is a singleton)", () => {
    const addExtraLib = vi.fn();
    const monaco = { languages: { typescript: { javascriptDefaults: { addExtraLib } } } };

    const { unmount } = render(<CodeEditor />);
    mocks.beforeMountSpy.mock.calls[0][0](monaco);
    unmount();

    render(<CodeEditor />);
    mocks.beforeMountSpy.mock.calls[1][0](monaco);

    expect(addExtraLib).toHaveBeenCalledTimes(1);
  });
});

describe("CodeEditor — undo/redo keybindings", () => {
  // Monaco's KeyMod/KeyCode are plain bit values; these are the real ones for
  // 0.52, so a renamed enum member would surface here as NaN rather than silently
  // registering the wrong chord.
  const monaco = { KeyMod: { CtrlCmd: 2048, Shift: 1024 }, KeyCode: { KeyY: 55, KeyZ: 56 } };

  function mountAndCollect() {
    const commands = new Map<number, () => void>();
    const editor = { addCommand: (k: number, h: () => void) => commands.set(k, h) };
    render(<CodeEditor />);
    mocks.onMountSpy.mock.calls[0][0](editor, monaco);
    return commands;
  }

  it("takes Ctrl+Z over from Monaco and steps the tab history instead", () => {
    const commands = mountAndCollect();

    commands.get(2048 | 56)!();

    expect(mocks.undo).toHaveBeenCalledTimes(1);
    expect(mocks.redo).not.toHaveBeenCalled();
  });

  it("binds both redo chords (Ctrl+Shift+Z and Ctrl+Y)", () => {
    const commands = mountAndCollect();

    commands.get(2048 | 1024 | 56)!();
    commands.get(2048 | 55)!();

    expect(mocks.redo).toHaveBeenCalledTimes(2);
    expect(mocks.undo).not.toHaveBeenCalled();
  });
});
