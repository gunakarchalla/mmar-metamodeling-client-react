import { describe, it, expect } from "vitest";
import { Validation } from "./validation";

describe("Validation.validate", () => {
  it("sets isValid true and clears the message when the value matches", () => {
    const v = new Validation();
    v.validate("12345", "^[0-9]+$", "must be digits");
    expect(v.isValid).toBe(true);
    expect(v.message).toBe("");
  });

  it("sets isValid false and stores the message when the value does not match", () => {
    const v = new Validation();
    v.validate("abc", "^[0-9]+$", "must be digits");
    expect(v.isValid).toBe(false);
    expect(v.message).toBe("must be digits");
  });

  it("accepts a RegExp instance as the pattern", () => {
    const v = new Validation();
    v.validate("hello", /^h/, "must start with h");
    expect(v.isValid).toBe(true);
  });
});
