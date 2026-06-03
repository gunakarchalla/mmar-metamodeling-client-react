import { describe, it, expect } from "vitest";
import { textify } from "./textify";

describe("textify", () => {
  it("returns 'text' for null/undefined/empty and null-ish strings", () => {
    expect(textify(null)).toBe("text");
    expect(textify(undefined)).toBe("text");
    expect(textify("")).toBe("text");
    expect(textify("null")).toBe("text");
    expect(textify("undefined")).toBe("text");
    expect(textify("not defined")).toBe("text");
  });

  it("lowercases other values", () => {
    expect(textify("Hello")).toBe("hello");
    expect(textify("ABC")).toBe("abc");
    expect(textify(123)).toBe("123");
  });
});
