import { describe, it, expect } from "vitest";
import { describeError } from "./describe-error";

describe("describeError", () => {
  it("uses an Error's message", () => {
    expect(describeError(new SyntaxError("Unexpected token"))).toBe("Unexpected token");
  });

  it("passes a thrown string through", () => {
    expect(describeError("boom")).toBe("boom");
  });

  it("serializes a thrown object", () => {
    // User geometry runs through `new Function(...)`, so it can throw anything.
    expect(describeError({ code: 42 })).toBe('{"code":42}');
  });

  it("survives a circular payload", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => describeError(circular)).not.toThrow();
  });

  it("renders undefined without throwing", () => {
    expect(describeError(undefined)).toBe("undefined");
  });
});
