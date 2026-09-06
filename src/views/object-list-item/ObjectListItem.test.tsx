// @vitest-environment jsdom
//
// The one thing this row must never do is render `<img src="">`. `vizRepIcon`
// returns an empty string for a VizRep that carries no usable inline image, and an
// image element with an empty src makes the browser re-request the current page —
// React 19 warns about exactly that. The row's own icon and the shared IconCell used
// by the object tables both have to treat "no icon" as "render no image at all".
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MetaObject } from "@gds/models/meta/Metamodel_metaobjects.structure";
import ObjectListItem from "./ObjectListItem";
import IconCell from "@/views/common/IconCell";

/** A VizRep whose `map` binding holds a variable, not an inline image. */
const NO_INLINE_IMAGE = "function r(){ let map = someVariable; }";
const WITH_ICON = "function r(){ let icon = 'data:image/png;base64,ABC123'; }";

const metaObject = (geometry: string) =>
  ({
    uuid: "obj-1",
    name: "Wheel",
    description: "",
    geometry,
  }) as unknown as MetaObject;

/** Every image in the document, so an empty src cannot hide behind a query by role. */
const images = () => Array.from(document.querySelectorAll("img"));

afterEach(cleanup);

describe("ObjectListItem — the VizRep icon", () => {
  it("renders the icon a VizRep does carry", () => {
    render(<ObjectListItem object={metaObject(WITH_ICON)} />);

    expect(images().map((i) => i.getAttribute("src"))).toEqual([
      "data:image/png;base64,ABC123",
    ]);
    expect(screen.getByText("Wheel")).toBeTruthy();
  });

  it("renders no image at all when the VizRep carries none, rather than an empty src", () => {
    render(<ObjectListItem object={metaObject(NO_INLINE_IMAGE)} />);

    expect(images()).toHaveLength(0);
    // The row still shows its name, so "no icon" never means "no row".
    expect(screen.getByText("Wheel")).toBeTruthy();
  });
});

describe("IconCell — the same rule for the object tables", () => {
  it("renders the image when there is one", () => {
    render(<IconCell src="data:image/png;base64,ABC123" name="Wheel" />);

    expect(images().map((i) => i.getAttribute("src"))).toEqual([
      "data:image/png;base64,ABC123",
    ]);
  });

  it("stands in a same-sized empty span when there is none, so the column keeps its width", () => {
    const { container } = render(<IconCell src="" name="Wheel" />);

    expect(images()).toHaveLength(0);
    const span = container.querySelector("span");
    expect(span?.style.width).toBe("32px");
    expect(span?.style.height).toBe("32px");
  });
});
