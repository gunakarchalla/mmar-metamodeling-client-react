// @vitest-environment jsdom
//
// The sub-tab framework: which tabs a type offers, and that each one resolves to
// something to render.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { SceneType, Class, Relationclass, AttributeType } from "@gds";

vi.mock("./general-tab/GeneralTab", () => ({
  default: () => <div data-testid="general-tab" />,
}));

import MiddleBody from "./MiddleBody";
import { TAB_DEFINITIONS } from "./tab-definitions";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";

const store = () => useSelectedObjectStore.getState();
const tabLabels = () => screen.getAllByRole("tab").map((tab) => tab.textContent);

beforeEach(() => {
  store().resetObjects();
  store().setObjects(
    [SceneType.fromJS({ uuid: "st-1", name: "Scene" }) as SceneType],
    "SceneType",
  );
  store().setObjects([Class.fromJS({ uuid: "cl-1", name: "Klass" }) as Class], "Class");
  store().setObjects(
    [Relationclass.fromJS({ uuid: "rc-1", name: "Rel" }) as Relationclass],
    "RelationClass",
  );
  store().setObjects(
    [AttributeType.fromJS({ uuid: "at-1", name: "Type" }) as AttributeType],
    "AttributeType",
  );
});
afterEach(cleanup);

describe("MiddleBody sub-tabs", () => {
  it("offers the tabs that apply to the selected type", () => {
    store().setSelectedObject("st-1");
    render(<MiddleBody />);

    expect(tabLabels()).toEqual(
      expect.arrayContaining([
        "General",
        "Attributes",
        "Classes",
        "Ports",
        "RelationClasses",
        "Procedures",
      ]),
    );
    expect(tabLabels()).not.toContain("Reference");
  });

  it("offers a different set for a type with different children", () => {
    store().setSelectedObject("at-1");
    render(<MiddleBody />);

    expect(tabLabels()).toEqual(expect.arrayContaining(["General", "Reference", "Table"]));
    expect(tabLabels()).not.toContain("Classes");
  });

  it("starts a newly opened object on General", () => {
    store().setSelectedObject("st-1");
    render(<MiddleBody />);

    expect(screen.getByTestId("general-tab")).toBeTruthy();
  });

  it("renders the child list behind a structural tab", () => {
    store().setSelectedObject("st-1");
    render(<MiddleBody />);

    fireEvent.click(screen.getByRole("tab", { name: "Classes" }));

    // ParentChildSelect titles its fieldset after the child type it holds.
    expect(screen.getByText("Classs")).toBeTruthy();
    expect(screen.queryByTestId("general-tab")).toBeNull();
  });

  it("renders both lists of a tab that declares two", () => {
    store().setSelectedObject("rc-1");
    render(<MiddleBody />);

    fireEvent.click(screen.getByRole("tab", { name: "Relations" }));

    expect(screen.getByText("Sources")).toBeTruthy();
    expect(screen.getByText("Destinations")).toBeTruthy();
  });

  it("declares at least one child list for every tab other than General", () => {
    const empty = TAB_DEFINITIONS.filter(
      (tab) => tab.label !== "General" && tab.lists.length === 0,
    ).map((tab) => tab.label);

    expect(empty).toEqual([]);
  });
});
