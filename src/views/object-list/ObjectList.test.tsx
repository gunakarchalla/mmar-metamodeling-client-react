// @vitest-environment jsdom
//
// A left-navigation section renders inside a bounded scroll box, and above a
// threshold it mounts only the rows near the viewport. Both halves are load
// bearing: the box is what makes the windowing tractable, and the windowing is
// what stops a type with several hundred objects costing a second to expand.
// What must never happen is a row going missing from the user's point of view —
// searching has to reach objects that are not currently mounted, and the
// scrollbar has to reflect the whole list rather than the rendered slice.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Class } from "@gds/models/meta/Metamodel_classes.structure";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import ObjectList from "./ObjectList";

const store = () => useSelectedObjectStore.getState();

/** `n` classes named so that sort order and creation order agree. */
const classes = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const c = new Class(`uuid-${i}`, `Class ${String(i).padStart(4, "0")}`, "" as never, null as never);
    c.description = "";
    return c;
  });

const renderedRows = () => document.querySelectorAll(".object-list-item").length;

beforeEach(() => store().resetObjects());
afterEach(cleanup);

describe("ObjectList — small sections are untouched", () => {
  it("renders every row when the section is below the windowing threshold", () => {
    store().setObjects(classes(20), "Class");
    render(<ObjectList type="Class" />);

    expect(renderedRows()).toBe(20);
    expect(screen.getByText("Class 0000")).toBeTruthy();
    expect(screen.getByText("Class 0019")).toBeTruthy();
  });
});

describe("ObjectList — large sections are windowed", () => {
  it("mounts far fewer rows than the section holds", () => {
    store().setObjects(classes(500), "Class");
    render(<ObjectList type="Class" />);

    const mounted = renderedRows();
    expect(mounted).toBeGreaterThan(0);
    // The exact count depends on the measured row height; what matters is that it
    // is a small window rather than the whole collection.
    expect(mounted).toBeLessThan(100);
  });

  it("starts at the top of the list", () => {
    store().setObjects(classes(500), "Class");
    render(<ObjectList type="Class" />);

    expect(screen.getByText("Class 0000")).toBeTruthy();
    expect(screen.queryByText("Class 0499")).toBeNull();
  });

  it("keeps the scrollbar honest by padding for the rows it does not mount", () => {
    store().setObjects(classes(500), "Class");
    const { container } = render(<ObjectList type="Class" />);

    const spacers = container.querySelectorAll('li[aria-hidden="true"]');
    // Scrolled to the top there is nothing above, so exactly one spacer — the one
    // standing in for everything below.
    expect(spacers.length).toBe(1);
    expect(parseFloat((spacers[0] as HTMLElement).style.height)).toBeGreaterThan(0);
  });

  it("brings rows from deep in the list into view when scrolled", () => {
    store().setObjects(classes(500), "Class");
    const { container } = render(<ObjectList type="Class" />);
    const viewport = container.querySelector(".object-item-list")!.parentElement!;

    expect(screen.queryByText("Class 0200")).toBeNull();

    // jsdom does not lay out, so scrollTop must be set explicitly rather than
    // arrived at by scrolling; the component reads it off the element.
    Object.defineProperty(viewport, "scrollTop", { value: 200 * 34, writable: true });
    fireEvent.scroll(viewport);

    expect(screen.getByText("Class 0200")).toBeTruthy();
    expect(screen.queryByText("Class 0000")).toBeNull();
  });

  it("finds an object that is not currently mounted, because search filters the whole collection", () => {
    store().setObjects(classes(500), "Class");
    render(<ObjectList type="Class" />);

    expect(screen.queryByText("Class 0400")).toBeNull();

    fireEvent.change(screen.getByLabelText("search"), { target: { value: "Class 0400" } });

    expect(screen.getByText("Class 0400")).toBeTruthy();
    expect(renderedRows()).toBe(1);
  });
});
