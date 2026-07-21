// @vitest-environment jsdom
//
// D1/D4 conditional rendering: the full VizRep block (Monaco + Preview + canvas) appears
// only for Class / RelationClass / Port — the three types the preview pipeline supports.
// Every other type keeps the plain geometry textarea, relocated after Rotation.
//
// VizRepGeometryEditor is stubbed so this suite stays free of Monaco and three.js; what
// is under test is the dispatch, not the block's contents.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Class } from "@gds";

vi.mock("./vizrep-editor/VizRepGeometryEditor", () => ({
  default: () => <div data-testid="vizrep-editor" />,
}));

// The Procedure variant renders a Monaco editor for its definition. Its worker
// wiring is unloadable under jsdom, and the editor itself stands in as a plain
// textarea — what is under test here is the dispatch, not either editor.
vi.mock("@/views/code-editor/monaco-setup", () => ({}));
vi.mock("@monaco-editor/react", () => ({
  default: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string | undefined) => void;
  }) => (
    <textarea
      data-testid="monaco"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

import GeneralTab from "./GeneralTab";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";

function selectAs(type: string) {
  const obj = new Class("uuid-1", "Demo", false, false);
  obj.geometry = "some geometry" as unknown as typeof obj.geometry;
  useSelectedObjectStore.setState({ selectedObject: obj, type });
}

const vizrepBlock = () => screen.queryByTestId("vizrep-editor");
const geometryTextarea = () => screen.queryByLabelText(/geometry/i);

beforeEach(() => {
  useSelectedObjectStore.setState({ selectedObject: null, type: null });
});

afterEach(cleanup);

describe("GeneralTab — geometry field dispatch (D1)", () => {
  it.each(["Class", "RelationClass", "Port"])(
    "renders the VizRep editor and no textarea for %s",
    (type) => {
      selectAs(type);
      render(<GeneralTab />);

      expect(vizrepBlock()).not.toBeNull();
      expect(geometryTextarea()).toBeNull();
    },
  );

  it.each(["User", "UserGroup", "Attribute", "AttributeType", "SceneType", "Procedure", "File"])(
    "renders the plain geometry textarea and no VizRep editor for %s",
    (type) => {
      selectAs(type);
      render(<GeneralTab />);

      expect(vizrepBlock()).toBeNull();
      expect(geometryTextarea()).not.toBeNull();
    },
  );

  it("renders nothing when no object is selected", () => {
    const { container } = render(<GeneralTab />);
    expect(container.firstChild).toBeNull();
  });
});

describe("GeneralTab — geometry field placement (D4)", () => {
  // Node.DOCUMENT_POSITION_FOLLOWING
  const FOLLOWING = 4;

  it("places the VizRep block after Rotation and before the type-specific fields", () => {
    selectAs("Class");
    render(<GeneralTab />);

    const rotation = screen.getByText("Rotation");
    const block = screen.getByTestId("vizrep-editor");
    // "Reusable" is a GeneralTabClass field — the variant section.
    const variantField = screen.getByText("Reusable");

    expect(rotation.compareDocumentPosition(block) & FOLLOWING).toBeTruthy();
    expect(block.compareDocumentPosition(variantField) & FOLLOWING).toBeTruthy();
  });

  it("places the plain textarea in the same slot for non-VizRep types", () => {
    selectAs("User");
    render(<GeneralTab />);

    const rotation = screen.getByText("Rotation");
    const geometry = geometryTextarea()!;

    expect(geometry).not.toBeNull();
    expect(rotation.compareDocumentPosition(geometry) & FOLLOWING).toBeTruthy();
  });
});
