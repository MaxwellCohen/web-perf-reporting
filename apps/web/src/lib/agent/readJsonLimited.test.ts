import { describe, expect, it } from "vitest";
import { readJsonLimited } from "./readJsonLimited";

const post = (body: string) => new Request("http://x.test", { method: "POST", body });

describe("readJsonLimited", () => {
  it("parses a small JSON body", async () => {
    expect(await readJsonLimited(post('{"a":1}'), 100)).toEqual({ ok: true, body: { a: 1 } });
  });

  it("rejects invalid JSON with 400", async () => {
    expect(await readJsonLimited(post("nope"), 100)).toMatchObject({ ok: false, status: 400 });
  });

  it("rejects oversized bodies with 413", async () => {
    expect(await readJsonLimited(post(JSON.stringify("x".repeat(200))), 100)).toMatchObject({
      ok: false,
      status: 413,
    });
  });
});
