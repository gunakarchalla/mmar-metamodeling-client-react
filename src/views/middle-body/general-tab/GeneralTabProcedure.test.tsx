// @vitest-environment jsdom
//
// The Procedure definition is JavaScript, so it is edited in Monaco rather than the
// plain textarea the Aurelia original used. Monaco is stubbed with a textarea carrying
// the same value/onChange contract — what is under test is the binding to
// selectedObject.definition, not the editor's internals.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material";
import { Procedure } from "@gds";

vi.mock("@/views/code-editor/monaco-setup", () => ({}));
vi.mock("@monaco-editor/react", () => ({
  default: ({
    value,
    onChange,
    language,
    theme,
  }: {
    value: string;
    onChange: (v: string | undefined) => void;
    language: string;
    theme: string;
  }) => (
    <textarea
      data-testid="monaco"
      data-language={language}
      data-theme={theme}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

import GeneralTabProcedure from "./GeneralTabProcedure";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";

function select(definition: string) {
  useSelectedObjectStore.setState({
    selectedObject: new Procedure("uuid-1", "Demo", definition),
    type: "Procedure",
  });
}

const editor = () => screen.getByTestId("monaco") as HTMLTextAreaElement;
const definitionOf = () =>
  (useSelectedObjectStore.getState().selectedObject as unknown as { definition: string })
    .definition;

beforeEach(() => {
  useSelectedObjectStore.setState({ selectedObject: null, type: null });
});

afterEach(cleanup);

describe("GeneralTabProcedure", () => {
  it("renders nothing when no object is selected", () => {
    const { container } = render(<GeneralTabProcedure />);
    expect(container.firstChild).toBeNull();
  });

  it("edits the definition in a JavaScript Monaco editor, not a plain textfield", () => {
    select("const a = 1;");
    render(<GeneralTabProcedure />);

    expect(editor().value).toBe("const a = 1;");
    expect(editor().getAttribute("data-language")).toBe("javascript");
  });

  it("commits edits onto selectedObject.definition", () => {
    select("");
    render(<GeneralTabProcedure />);

    fireEvent.change(editor(), { target: { value: "return 42;" } });

    expect(definitionOf()).toBe("return 42;");
  });

  it.each([
    ["light", "vs"],
    ["dark", "vs-dark"],
  ] as const)("follows the MUI palette in %s mode", (mode, expected) => {
    select("");
    render(
      <ThemeProvider theme={createTheme({ palette: { mode } })}>
        <GeneralTabProcedure />
      </ThemeProvider>,
    );

    expect(editor().getAttribute("data-theme")).toBe(expected);
  });

  it("renders an empty buffer when the definition is unset", () => {
    useSelectedObjectStore.setState({
      selectedObject: new Procedure("uuid-1", "Demo", undefined as unknown as string),
      type: "Procedure",
    });
    render(<GeneralTabProcedure />);

    expect(editor().value).toBe("");
  });
});
