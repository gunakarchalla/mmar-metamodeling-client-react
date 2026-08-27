// @vitest-environment jsdom
//
// jsdom supplies the `localStorage` the bearer token is read from.
//
// The body is asserted literally: a new attribute type is created with a
// pattern already in it, and a wrong or missing one silently leaves every
// attribute of that type unvalidated.
import { describe, it, expect, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn(), addObject: vi.fn() }));
vi.mock("./api", () => ({ apiFetch: mocks.apiFetch, errorMessageOf: () => "" }));
vi.mock("@/resources/store/selectedObjectStore", () => ({
  useSelectedObjectStore: { getState: () => ({ addObject: mocks.addObject }) },
}));

import { backendService } from "./backend-service";

/** The pattern the whole platform means by "any well formed UTF-8 text". */
const UTF8_PATTERN =
  "^([\\x09\\x0A\\x0D\\x20-\\x7E]|[\\xC2-\\xDF][\\x80-\\xBF]|\\xE0[\\xA0-\\xBF][\\x80-\\xBF]|[\\xE1-\\xEC\\xEE\\xEF][\\x80-\\xBF]{2}|\\xED[\\x80-\\x9F][\\x80-\\xBF]|\\xF0[\\x90-\\xBF][\\x80-\\xBF]{2}|[\\xF1-\\xF3][\\x80-\\xBF]{3}|\\xF4[\\x80-\\x8F][\\x80-\\xBF]{2})*$";

const okJson = (body: unknown) => ({ ok: true, json: () => Promise.resolve(body) });

/** The parsed JSON body of the single POST `createNewObject` made. */
const postedBody = () => JSON.parse(mocks.apiFetch.mock.calls[0][1].body as string);

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem("auth_token", "tok");
  mocks.apiFetch.mockResolvedValue(okJson({ uuid: "new-1" }));
});

describe("backendService.createNewObject — the default RegEx of a new attribute type", () => {
  it("posts the UTF-8 pattern as the regex_value", async () => {
    await backendService.createNewObject("AttributeType");

    expect(postedBody().regex_value).toBe(UTF8_PATTERN);
  });

  // The pattern enumerates well formed UTF-8 *byte* sequences, so `new RegExp`
  // — which matches code points, not bytes — accepts printable ASCII plus tab,
  // CR and LF, and accepts anything above U+007F only in its encoded byte form.
  // That is the platform's existing convention (it is the pattern init.sql gives
  // the built-in String type), so the test pins it rather than arguing with it.
  it("posts a pattern that compiles and accepts ordinary text", async () => {
    await backendService.createNewObject("AttributeType");

    const pattern = new RegExp(postedBody().regex_value);
    expect(pattern.test("Hello world")).toBe(true);
    expect(pattern.test("")).toBe(true);
    expect(pattern.test("line\r\n\tindented")).toBe(true);
    // A NUL byte is the thing the pattern is there to keep out.
    expect(pattern.test("a\u0000b")).toBe(false);
  });

  it("posts a pattern that accepts non-ASCII text in its UTF-8 byte form", async () => {
    await backendService.createNewObject("AttributeType");

    const pattern = new RegExp(postedBody().regex_value);
    const asBytes = (text: string) =>
      Array.from(new TextEncoder().encode(text))
        .map((byte) => String.fromCharCode(byte))
        .join("");

    expect(pattern.test(asBytes("café"))).toBe(true);
    expect(pattern.test(asBytes("🚀"))).toBe(true);
    // A lone continuation byte is not a valid encoding.
    expect(pattern.test("\u0080")).toBe(false);
  });

  it("leaves other types without a regex_value", async () => {
    await backendService.createNewObject("Class");

    expect(postedBody()).not.toHaveProperty("regex_value");
  });
});
