import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, expect, it } from "vitest";
import { measureStream } from "../src/stream.js";

let server: http.Server;
let base = "";

beforeAll(async () => {
  server = http.createServer((req, res) => {
    if (req.url === "/redirect") {
      res.writeHead(302, { location: "/" });
      return res.end();
    }
    res.writeHead(200, { "content-type": "text/html" });
    res.write("<html><body>shell");
    setTimeout(() => {
      res.write('<div hidden id="S:0">x</div><script>$RC("B:0","S:0")</script>');
      res.end();
    }, 400);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

it("records the late chunk and the wait before it", async () => {
  const m = await measureStream(base);
  expect(m.chunks).toHaveLength(2);
  expect(m.chunks[1].late).toBe(true);
  expect(m.chunks[1].t - m.chunks[0].t).toBeGreaterThan(300);
});

it("excludes redirect hops from the count", async () => {
  const m = await measureStream(`${base}/redirect`);
  expect(m.redirects).toBe(1);
  expect(m.finalUrl).toBe(`${base}/`);
});
