import type { StreamMeasurement } from "./types";
import { parseMeasurement } from "./validate";

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

type Compact = {
  v: 2;
  u: string; f?: string; s: number; ct?: string; ce?: string; m: "server" | "local"; st: string;
  h: number; tot: number; lb?: number; r?: number; tr?: 1; co?: 1;
  /** [t, bytes, end (0 = none), late (0|1), preview] */
  c: [number, number, number, 0 | 1, string][];
};

const MAX_ENCODED_CHARS = 12000;

function compact(m: StreamMeasurement, previews: "all" | "late" | "none"): Compact {
  return {
    v: 2, u: m.url.slice(0, 300), f: m.finalUrl?.slice(0, 300), s: m.status, ct: m.contentType?.slice(0, 100), ce: m.contentEncoding?.slice(0, 40),
    m: m.measuredFrom, st: m.startedAt, h: m.headersMs, tot: m.totalMs, lb: m.lastByteMs,
    r: m.redirects, tr: m.truncated ? 1 : undefined, co: m.coalesced ? 1 : undefined,
    c: m.chunks.map((k) => {
      const keep = previews === "all" || (previews === "late" && k.late);
      return [k.t, k.bytes, k.end ?? 0, k.late ? 1 : 0, keep ? (k.preview ?? "").slice(0, previews === "late" ? 40 : 80) : ""];
    }),
  };
}

/** Stateless share: a compact form of the measurement lives in the URL fragment, dropping previews if it grows past ~12KB (chunks are already capped near 300). */
export function encodeMeasurement(m: StreamMeasurement, maxChars = MAX_ENCODED_CHARS): string {
  let out = "";
  for (const level of ["all", "late", "none"] as const) {
    out = toBase64Url(new TextEncoder().encode(JSON.stringify(compact(m, level))));
    if (out.length <= maxChars) break;
  }
  return out;
}

export function decodeMeasurement(encoded: string): StreamMeasurement | null {
  try {
    const c = JSON.parse(new TextDecoder().decode(fromBase64Url(encoded))) as Compact;
    if (c?.v !== 2 || !Array.isArray(c.c)) return null;
    return parseMeasurement({
      url: c.u, finalUrl: c.f, status: c.s, contentType: c.ct, contentEncoding: c.ce, measuredFrom: c.m,
      startedAt: c.st, headersMs: c.h, totalMs: c.tot, lastByteMs: c.lb, redirects: c.r, truncated: c.tr === 1, coalesced: c.co === 1,
      chunks: c.c.map((k) => ({
        t: k[0], bytes: k[1], ...(k[2] ? { end: k[2] } : {}), ...(k[3] ? { late: true } : {}), ...(k[4] ? { preview: k[4] } : {}),
      })),
    });
  } catch {
    return null;
  }
}

export function shareUrlFor(siteUrl: string, m: StreamMeasurement): string {
  return `${siteUrl}/stream#r=${encodeMeasurement(m)}`;
}

/** Comparison link: A in `r`, B in `b`, each trimmed harder so the whole URL stays near 12KB. */
export function shareCompareUrlFor(siteUrl: string, a: StreamMeasurement, b: StreamMeasurement): string {
  return `${siteUrl}/stream#r=${encodeMeasurement(a, MAX_ENCODED_CHARS / 2)}&b=${encodeMeasurement(b, MAX_ENCODED_CHARS / 2)}`;
}
