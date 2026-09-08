import { describe, it, expect } from "vitest";
import { unwrapRegexLiteral } from "./regex";

describe("unwrapRegexLiteral", () => {
  it("strips a /pattern/flags literal", () => {
    expect(unwrapRegexLiteral("/^(tcp|udp)$/gim")).toBe("^(tcp|udp)$");
    expect(unwrapRegexLiteral("  /^(tcp|udp)$/  ")).toBe("^(tcp|udp)$");
  });

  it("strips a stray leading slash left when the trailing /flags was lost", () => {
    expect(unwrapRegexLiteral("/^(tcp|udp)$")).toBe("^(tcp|udp)$");
  });

  it("leaves a bare pattern untouched, slashes in the body included", () => {
    expect(unwrapRegexLiteral("^[0-9]+$")).toBe("^[0-9]+$");
    expect(unwrapRegexLiteral("^https?:\\/\\/.+$")).toBe("^https?:\\/\\/.+$");
  });

  it("produces a pattern that matches the value the wrapped form rejected", () => {
    const pattern = unwrapRegexLiteral("/^(\\d{1,3}\\.){3}\\d{1,3}$/gim");
    expect(new RegExp(pattern).test("255.255.255.0")).toBe(true);
  });
});
