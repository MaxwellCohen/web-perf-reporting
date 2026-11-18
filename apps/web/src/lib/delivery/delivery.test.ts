import http from "node:http";
import http2 from "node:http2";
import type { AddressInfo } from "node:net";
import { gzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  checkDelivery,
  extractAssets,
  fetchWire,
  renderDeliveryMarkdown,
} from "@maxwellcohen/delivery-core";

const BIG = "x".repeat(50_000);
const PAGE = `<!doctype html><html><head><script src="/ok.js"></script><script src="/cut.js"></script><link rel="stylesheet" href="/rst.css"></head><body>hi</body></html>`;
const JS = `function a(){ return [1,2,3].map((n) => n * 2); }\nconsole.log(a());\n`;

let h1: http.Server;
let h2: http2.Http2Server;
let h1Url = "";
let h2Url = "";

beforeAll(async () => {
  h1 = http.createServer((req, res) => {
    if (req.url === "/ok") {
      res.setHeader("content-type", "text/plain");
      return res.end("hello");
    }
    if (req.url === "/gz") {
      const body = gzipSync(Buffer.from(BIG));
      res.writeHead(200, { "content-encoding": "gzip", "content-type": "text/plain" });
      res.write(body.subarray(0, body.length / 2));
      return setTimeout(() => res.socket!.destroy(), 20);
    }
    if (req.url === "/short") {
      res.writeHead(200, { "content-length": "1000", "content-type": "text/plain" });
      res.write("x".repeat(100));
      return setTimeout(() => res.socket!.destroy(), 20);
    }
    if (req.url === "/trunc.js") {
      res.writeHead(200, { "content-type": "application/javascript" });
      return res.end(JS.slice(0, 40));
    }
    if (req.url === "/module.js") {
      res.writeHead(200, { "content-type": "application/javascript" });
      return res.end(`import x from "./x.js";\nexport const y = x;\n`);
    }
    if (req.url === "/go") {
      res.writeHead(302, { location: "/ok" });
      return res.end();
    }
    res.writeHead(404).end();
  });
  h2 = http2.createServer();
  h2.on("stream", (stream: http2.ServerHttp2Stream, headers) => {
    stream.on("error", () => {});
    const path = headers[":path"];
    if (path === "/") {
      stream.respond({ ":status": 200, "content-type": "text/html" });
      return stream.end(PAGE);
    }
    if (path === "/ok.js") {
      stream.respond({ ":status": 200, "content-type": "application/javascript" });
      return stream.end(JS);
    }
    if (path === "/cut.js") {
      stream.respond({ ":status": 200, "content-type": "application/javascript" });
      return stream.end(JS.slice(0, 40));
    }
    if (path === "/rst.css") {
      stream.respond({ ":status": 200, "content-type": "text/css", "content-length": "5000" });
      stream.write("a".repeat(1000));
      return void setTimeout(() => stream.destroy(new Error("reset")), 20);
    }
    if (path === "/slowpage") {
      stream.respond({ ":status": 200, "content-type": "text/html" });
      return stream.end(
        `<html>${[1, 2, 3, 4, 5, 6].map((n) => `<script src="/hang${n}.js"></script>`).join("")}</html>`,
      );
    }
    if (path?.startsWith("/hang"))
      return stream.respond({ ":status": 200, "content-type": "application/javascript" });
    stream.respond({ ":status": 404 });
    stream.end();
  });
  await Promise.all([
    new Promise<void>((r) => h1.listen(0, "127.0.0.1", r)),
    new Promise<void>((r) => h2.listen(0, "127.0.0.1", r)),
  ]);
  h1Url = `http://127.0.0.1:${(h1.address() as AddressInfo).port}`;
  h2Url = `http://127.0.0.1:${(h2.address() as AddressInfo).port}`;
});

afterAll(() => {
  h1.closeAllConnections();
  h1.close();
  h2.close();
});

describe("fetchWire", () => {
  it("reports a complete HTTP/1.1 response with timings", async () => {
    const r = await fetchWire(`${h1Url}/ok`);
    expect(r).toMatchObject({
      protocol: "http/1.1",
      status: 200,
      receivedBytes: 5,
      complete: true,
    });
    expect(r.end.kind).toBe("complete");
    expect(r.timings.totalMs).toBeGreaterThan(0);
  });

  it("flags an early socket close with content-length as a ghost", async () => {
    const r = await fetchWire(`${h1Url}/short`);
    expect(r).toMatchObject({
      status: 200,
      declaredBytes: 1000,
      complete: false,
      check: "content-length",
    });
    expect(r.end.kind).toBe("socket_close");
    expect(r.receivedBytes).toBeLessThan(1000);
  });

  it("detects truncated compressed data via the decoder", async () => {
    const r = await fetchWire(`${h1Url}/gz`);
    expect(r).toMatchObject({ status: 200, complete: false, contentEncoding: "gzip" });
    expect(r.end.kind).not.toBe("complete");
  });

  it("flags truncated JS without content-length via js-parse, but not module syntax", async () => {
    const cut = await fetchWire(`${h1Url}/trunc.js`);
    expect(cut).toMatchObject({ status: 200, complete: false, check: "js-parse" });
    const mod = await fetchWire(`${h1Url}/module.js`);
    expect(mod.complete).not.toBe(false);
  });

  it("follows redirects only when asked", async () => {
    expect((await fetchWire(`${h1Url}/go`)).status).toBe(302);
    expect((await fetchWire(`${h1Url}/go`, { maxRedirects: 5 })).url).toBe(`${h1Url}/ok`);
  });

  it("reports connection errors as a result", async () => {
    const r = await fetchWire("http://127.0.0.1:1/");
    expect(r).toMatchObject({ status: 0, complete: null });
    expect(r.end.kind).toBe("error");
  });

  it("refuses URLs rejected by assertUrl", async () => {
    await expect(
      fetchWire(`${h1Url}/ok`, {
        assertUrl: () => {
          throw new Error("nope");
        },
      }),
    ).rejects.toThrow("nope");
  });
});

describe("checkDelivery over HTTP/2", () => {
  it("flags a mid-body RST_STREAM and truncated JS assets as ghosts", async () => {
    const report = await checkDelivery(`${h2Url}/`, { h2c: true, runs: 1 });
    expect(report.document).toMatchObject({ protocol: "h2", status: 200, complete: true });
    const by = Object.fromEntries(report.assets.map((a) => [new URL(a.url).pathname, a]));
    expect(by["/ok.js"].complete).toBe(true);
    expect(by["/cut.js"]).toMatchObject({ complete: false, check: "js-parse" });
    expect(by["/rst.css"]).toMatchObject({ complete: false, check: "content-length" });
    expect(by["/rst.css"].end).toMatchObject({ kind: "rst_stream", code: "INTERNAL_ERROR (2)" });
    expect(report.ghosts).toBe(2);
    const md = renderDeliveryMarkdown(report);
    expect(md).toContain("curl --http2");
    expect(md).toContain("### Ticket: ghost error on");
  });

  it("reports unstarted assets as not checked once the budget is spent", async () => {
    const report = await checkDelivery(`${h2Url}/slowpage`, { h2c: true, deadlineMs: 400 });
    expect(report.document.complete).toBe(true);
    expect(report.assets.every((a) => a.end.kind === "timeout")).toBe(true);
    expect(report.notChecked.length).toBeGreaterThan(0);
    expect(report.assets.length + report.notChecked.length).toBe(6);
  });

  it("completes under a slow read", async () => {
    const r = await fetchWire(`${h2Url}/ok.js`, { h2c: true, slowReadBytesPerSec: 100_000 });
    expect(r.complete).toBe(true);
  });
});

describe("extractAssets", () => {
  it("collects scripts, stylesheets, modulepreload and preloads; dedupes; http(s) only", () => {
    const html = `
      <script src="/a.js"></script><script src='/a.js'></script><script>inline()</script>
      <link rel="stylesheet" href="b.css"><link rel="modulepreload" href="https://cdn.example/m.js">
      <link rel="preload" as="script" href="/p.js"><link rel="preload" as="font" href="/f.woff2">
      <link rel="icon" href="/i.png"><script src="data:text/javascript,1"></script>`;
    expect(extractAssets(html, "https://x.test/dir/page", 10)).toEqual([
      "https://x.test/a.js",
      "https://x.test/dir/b.css",
      "https://cdn.example/m.js",
      "https://x.test/p.js",
    ]);
    expect(extractAssets(html, "https://x.test/", 2)).toHaveLength(2);
  });
});
