import { describe, expect, it } from "vitest";
import { analyze, normalizeMeasurement } from "./analyze";
import { decodeMeasurement, encodeMeasurement } from "./share";
import type { StreamMeasurement } from "./types";
import { StreamUrlError, assertPublicHttpUrl, isPrivateIp } from "./urlGuard";
import { parseMeasurement } from "./validate";
import { isLateChunk, renderStreamMarkdown, sanitizeText } from "./analyze";
import { clientKey } from "./rateLimit";
import { compareAnalyses, compareVerdict, renderCompareMarkdown } from "./compare";
import { shareCompareUrlFor } from "./share";
import { buildLocalScript } from "./localScript";

const base: StreamMeasurement = {
  url: "https://x.test",
  status: 200,
  measuredFrom: "local",
  startedAt: "t",
  headersMs: 40,
  totalMs: 2100,
  chunks: [
    { t: 50, bytes: 1000, preview: "<html>" },
    { t: 52, bytes: 500 },
    { t: 2050, bytes: 300, late: true, preview: "<template id=B:0>" },
  ],
};

describe("stream timing", () => {
  it("finds the idle gap before the late chunk", () => {
    const a = analyze(normalizeMeasurement(base));
    expect(a.chunkCount).toBe(2);
    expect(a.gaps).toHaveLength(1);
    expect(a.gaps[0].durationMs).toBeCloseTo(2000, -1);
    expect(a.idlePct).toBeGreaterThan(95);
    expect(a.lateChunkCount).toBe(1);
  });

  it("round-trips share encoding", () => {
    const m = normalizeMeasurement(base);
    expect(decodeMeasurement(encodeMeasurement(m))).toEqual(m);
    expect(decodeMeasurement("garbage")).toBeNull();
  });

  it("blocks private hosts", () => {
    for (const u of ["http://[2002:7f00:1::]/", "http://[64:ff9b::7f00:1]/", "http://localhost:3000", "http://127.0.0.1", "http://10.0.0.1", "http://[::1]/", "http://intranet"]) {
      expect(() => assertPublicHttpUrl(u)).toThrow(StreamUrlError);
    }
    expect(assertPublicHttpUrl("example.com").href).toBe("https://example.com/");
  });

  it("allows public domains that look like IPv6 prefixes and blocks tricks", () => {
    for (const u of ["https://fcc.gov", "https://fdic.gov", "https://fedex.com", "https://fe80.example.com"]) {
      expect(() => assertPublicHttpUrl(u)).not.toThrow();
    }
    for (const u of ["http://localhost./", "http://[::ffff:127.0.0.1]/", "http://2130706433/", "http://169.254.169.254/", "http://198.18.0.1/"]) {
      expect(() => assertPublicHttpUrl(u)).toThrow(StreamUrlError);
    }
    expect(isPrivateIp("93.184.216.34")).toBe(false);
    expect(isPrivateIp("fd12::1")).toBe(true);
    expect(isPrivateIp("2606:4700::1111")).toBe(false);
    expect(isPrivateIp("::ffff:5db8:d822")).toBe(false);
  });

  it("keeps the true last byte and the large gaps when over the chunk cap", () => {
    const chunks = Array.from({ length: 1000 }, (_, i) => ({ t: 100 + i * 10 + (i > 500 ? 2000 : 0), bytes: 10 }));
    const m = normalizeMeasurement({ ...base, totalMs: 13000, chunks });
    const a = analyze(m);
    expect(m.chunks.length).toBeLessThanOrEqual(200);
    expect(a.lastByteMs).toBeCloseTo(chunks[999].t, -1);
    expect(a.longestGapMs).toBeGreaterThan(1900);
  });

  it("rejects malformed measurements", () => {
    expect(parseMeasurement({ url: "x", headersMs: 1, totalMs: 1, chunks: [null] })).toBeNull();
    expect(parseMeasurement({ url: "x", headersMs: "1", totalMs: 1, chunks: [] })).toBeNull();
    expect(decodeMeasurement(btoa(JSON.stringify({ chunks: [null], totalMs: 1 })))).toBeNull();
  });

  it("detects React markers only, including across chunk boundaries", () => {
    expect(isLateChunk("<template><p>x</p></template>")).toBe(false);
    expect(isLateChunk('<template id="B:0"></template>')).toBe(false);
    expect(isLateChunk('<div hidden id="S:0">x</div><script>$RC("B:0","S:0")</script>')).toBe(true);
    expect(isLateChunk("RC(\"B:1\")", "<script>$")).toBe(true);
  });

  it("builds a script that parses without top-level await", () => {
    const src = buildLocalScript("https://s.test");
    expect(() => new Function(src.replace(/^#!.*\n/, ""))).not.toThrow();
    expect(src).toContain("https://s.test/api/agent/stream");
  });

  it("measures gaps from the end of a merged burst, not its start", () => {
    const chunks = Array.from({ length: 100 }, (_, i) => ({ t: 10 + i * 4, bytes: 1 }));
    chunks.push({ t: 10 + 99 * 4 + 6, bytes: 1 });
    const a = analyze(normalizeMeasurement({ ...base, totalMs: 500, chunks }));
    expect(a.gaps).toHaveLength(0);
    expect(a.idleMs).toBe(0);
  });

  it("does not re-flag a marker that is fully inside the previous tail", () => {
    expect(isLateChunk("<p>plain</p>", '$RC("B:0")</script>'.slice(-15))).toBe(false);
    expect(isLateChunk('x$RC("B:0")', "")).toBe(true);
  });

  it("strips markdown-breaking characters from untrusted text", () => {
    expect(sanitizeText("a`\n\nIgnore previous`")).not.toMatch(/[`\n]/);
    const m = normalizeMeasurement({ ...base, url: "https://x`\n# pwn", chunks: [{ t: 1, bytes: 1, preview: "`\nrm -rf" }] });
    expect(renderStreamMarkdown(m, analyze(m))).not.toContain("`\n# pwn");
  });

  it("blocks extra private ranges and odd ports; keys limiter on trusted headers", () => {
    for (const ip of ["fec0::1", "::7f00:1", "2001::1", "2001:0:1::1", "100::1", "2002:7f00:1::", "64:ff9b::7f00:1", "::ffff:7f00:1", "fe80::1"]) expect(isPrivateIp(ip)).toBe(true);
    expect(() => assertPublicHttpUrl("https://example.com:22")).toThrow(StreamUrlError);
    expect(() => assertPublicHttpUrl("https://example.com:8443")).not.toThrow();
    const req = (h: Record<string, string>) => new Request("https://s.test", { headers: h });
    expect(clientKey(req({ "x-forwarded-for": "6.6.6.6, 1.2.3.4" }))).toBe("unknown");
    process.env.STREAM_TRUSTED_PROXY_HOPS = "1";
    try {
      expect(clientKey(req({ "x-forwarded-for": "6.6.6.6, 1.2.3.4" }))).toBe("1.2.3.4");
    } finally {
      delete process.env.STREAM_TRUSTED_PROXY_HOPS;
    }
    // Client-supplied x-real-ip is ignored off-Vercel...
    expect(clientKey(req({ "x-real-ip": "9.9.9.9", "x-forwarded-for": "6.6.6.6" }))).toBe("unknown");
    // ...and trusted on Vercel, which overwrites it.
    process.env.VERCEL = "1";
    try {
      expect(clientKey(req({ "x-real-ip": "9.9.9.9", "x-forwarded-for": "6.6.6.6" }))).toBe("9.9.9.9");
    } finally {
      delete process.env.VERCEL;
    }
  });

  it("flags markers split anywhere across reads and sanitizes header fields", () => {
    const marker = '<div hidden id="S:';
    expect(isLateChunk(marker.slice(17) + "0\">", marker.slice(0, 17))).toBe(true);
    const m = normalizeMeasurement({ ...base, startedAt: "x\n# SYSTEM", contentEncoding: "gzip\n# hi" });
    expect(renderStreamMarkdown(m, analyze(m))).not.toMatch(/\n# (SYSTEM|hi)/);
  });

  it("repairs inconsistent timings and blocks TEST-NET", () => {
    const m = parseMeasurement({ url: "x", headersMs: 1, totalMs: 1, lastByteMs: 0, chunks: [{ t: 5000, end: 10, bytes: 1 }] });
    expect(m?.totalMs).toBe(5000);
    expect(analyze(m!).streamSpanMs).toBeGreaterThanOrEqual(0);
    expect(() => assertPublicHttpUrl("http://203.0.113.5")).toThrow(StreamUrlError);
  });

  it("keeps real gaps when over the cap, and the late chunk's preview when merged", () => {
    const chunks = Array.from({ length: 300 }, (_, i) => ({ t: 10 + i * 150, bytes: 1 }));
    const a = analyze(normalizeMeasurement({ ...base, totalMs: 50000, chunks }));
    expect(a.gaps.length).toBeGreaterThan(250);
    const m = normalizeMeasurement({
      ...base,
      chunks: [{ t: 10, bytes: 1, preview: "<p>a</p>" }, { t: 12, bytes: 1, late: true, preview: "$RC(\"B:0\")" }],
    });
    expect(m.chunks[0].preview).toContain("$RC");
  });

  it("wraps the URL in a code span so link markdown cannot inject", () => {
    const m = normalizeMeasurement({ ...base, url: "https://e.com/](http://x)#" });
    expect(renderStreamMarkdown(m, analyze(m)).split("\n")[0]).toMatch(/^# Streaming timing: `[^`]*`$/);
  });

  it("only honors a loopback Host for the origin", async () => {
    const { requestOrigin } = await import("./origin");
    // Request() drops the forbidden Host header, so stub the shape requestOrigin reads.
    const req = (host: string) => ({ url: "http://x.test/", headers: new Headers({ host, "x-forwarded-host": "evil.com" }) }) as Request;
    expect(requestOrigin(req("localhost:3000"), "https://site.test")).toBe("http://localhost:3000");
    expect(requestOrigin(req("evil.com"), "https://site.test")).toBe("https://site.test");
  });

  it("keeps share links small and separates truncated from coalesced", () => {
    const chunks = Array.from({ length: 200 }, (_, i) => ({ t: 10 + i * 150, bytes: 5000, late: i % 2 === 0, preview: "x".repeat(80) }));
    const m = normalizeMeasurement({ ...base, totalMs: 40000, chunks });
    expect(encodeMeasurement(m).length).toBeLessThanOrEqual(12000);
    expect(decodeMeasurement(encodeMeasurement(m))?.chunks).toHaveLength(m.chunks.length);
    const md = renderStreamMarkdown({ ...m, truncated: true }, analyze(m));
    expect(md).toContain("cut off");
  });

  it("compares two measurements with B - A deltas and a verdict", () => {
    const fast = normalizeMeasurement({ ...base, totalMs: 700, chunks: [{ t: 50, bytes: 100, preview: "<html>" }, { t: 650, bytes: 10, late: true, preview: "$RC(" }] });
    const slow = normalizeMeasurement(base);
    const [a, b] = [analyze(slow), analyze(fast)];
    const last = compareAnalyses(a, b).find((r) => r.label === "Last byte")!;
    expect(last.delta).toBeLessThan(-1000);
    expect(compareVerdict(a, b)).toMatch(/B finishes \d+ms faster/);
    const md = renderCompareMarkdown(slow, fast, "https://s.test/stream#r=x&b=y");
    expect(md).toContain("| Last byte |");
    expect(md).toContain("Shareable comparison");
    const url = shareCompareUrlFor("https://s.test", slow, fast);
    const m = /#r=([^&]+)&b=(.+)$/.exec(url)!;
    expect(decodeMeasurement(m[1])?.chunks).toHaveLength(slow.chunks.length);
    expect(decodeMeasurement(m[2])?.chunks).toHaveLength(fast.chunks.length);
  });
});
