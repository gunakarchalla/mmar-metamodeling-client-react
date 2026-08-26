// The server answers every refusal as {"error": "..."}. Eight metamodel delete
// endpoints used to answer the bare message instead, and the log window showed
// that body verbatim — so once the server was made consistent, the envelope
// itself started reaching the user. errorMessageOf is what unwraps it.
//
// The 409 case is the one that matters: it names the object blocking the
// deletion, and it is the message a user acts on.
import { describe, it, expect } from "vitest";
import { errorMessageOf } from "./api";

const body = (text: string): Response => ({ text: () => Promise.resolve(text) }) as Response;

describe("errorMessageOf", () => {
  it("unwraps the error envelope the server sends", async () => {
    const conflict = JSON.stringify({
      error: "Cannot delete the meta object abc, because it is referenced by def",
    });
    expect(await errorMessageOf(body(conflict))).toBe(
      "Cannot delete the meta object abc, because it is referenced by def",
    );
  });

  it("accepts a bare JSON string, which is what those deletes used to send", async () => {
    expect(await errorMessageOf(body(JSON.stringify("plain message")))).toBe("plain message");
  });

  it("falls back to the raw text when the body is not JSON", async () => {
    expect(await errorMessageOf(body("upstream timed out"))).toBe("upstream timed out");
  });

  it("falls back to the raw text for JSON that is not the envelope", async () => {
    const other = JSON.stringify({ uuids: ["a", "b"] });
    expect(await errorMessageOf(body(other))).toBe(other);
  });

  it("returns an empty string for an empty body rather than throwing", async () => {
    expect(await errorMessageOf(body(""))).toBe("");
  });
});
