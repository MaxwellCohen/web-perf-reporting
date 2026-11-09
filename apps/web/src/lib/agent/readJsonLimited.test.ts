import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { readJsonLimited } from "./readJsonLimited";

const post = (body: string) => new Request("http://x.test", { method: "POST", body });
const gzipPost = (body: string) =>
  new Request("http://x.test", { method: "POST", body: gzipSync(Buffer.from(body)) });

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

  it("decompresses gzip only when opted in", async () => {
    expect(await readJsonLimited(gzipPost('{"a":1}'), 100, { allowGzip: true })).toEqual({
      ok: true,
      body: { a: 1 },
    });
    expect(await readJsonLimited(gzipPost('{"a":1}'), 100)).toMatchObject({
      ok: false,
      status: 400,
      reason: "invalid-json",
    });
  });

  it("caps the compressed upload", async () => {
    expect(await readJsonLimited(gzipPost(JSON.stringify({ a: "x".repeat(500) })), 10, { allowGzip: true })).toMatchObject({
      ok: false,
      status: 413,
      reason: "too-large",
    });
  });

  it("caps the decompressed body separately", async () => {
    expect(
      await readJsonLimited(gzipPost(JSON.stringify({ a: "x".repeat(500) })), 1000, {
        allowGzip: true,
        maxDecompressedBytes: 50,
      }),
    ).toMatchObject({ ok: false, status: 413, reason: "too-large" });
  });

  it("rejects invalid gzip bytes", async () => {
    const body = new Request("http://x.test", {
      method: "POST",
      body: Buffer.from([0x1f, 0x8b, 0x00, 0x00]),
    });
    expect(await readJsonLimited(body, 100, { allowGzip: true })).toMatchObject({
      ok: false,
      status: 400,
      reason: "invalid-gzip",
    });
  });
});
