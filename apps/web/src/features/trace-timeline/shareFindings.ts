import { z } from "zod";
import { FINDING_CATEGORIES, type TraceSnapshot } from "./findings";

const HASH_KEY = "r=";
const MAX_ENCODED_CHARS = 50_000;
const MAX_DECODED_BYTES = 256 * 1024;
export const MAX_SHARE_URL_CHARS = 8000;

const num = z.number().finite();
const nnum = num.nullable();
const str = (n: number) => z.string().max(n);

const Schema = z.object({
  v: z.literal(1),
  u: str(500).optional(),
  m: z.tuple([nnum, nnum, nnum, num, num, z.number().int().nonnegative(), num]), // ttfb fcp lcp cls tbt ltCount ltMs
  c: z.tuple([num, num, num, num, num]),
  f: z.array(z.object({ s: z.enum(["high", "medium", "low"]), t: str(500), d: str(1000) })).max(30),
  s: z.array(z.tuple([str(1000), num, z.number().int(), num])).max(10),
});

const r1 = (n: number) => Math.round(n * 10) / 10;
const rn = (n?: number) => (n == null ? null : r1(n));

function toB64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64Url(t: string): Uint8Array {
  const b = t.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b + "=".repeat((4 - (b.length % 4)) % 4)), (c) => c.charCodeAt(0));
}
async function pipe(
  bytes: Uint8Array,
  stream: CompressionStream | DecompressionStream,
  cap = Infinity,
): Promise<Uint8Array> {
  const w = stream.writable.getWriter();
  void w.write(bytes as BufferSource).catch(() => {});
  void w.close().catch(() => {});
  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > cap) {
      await reader.cancel().catch(() => {});
      throw new Error("too large");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

type Opts = { scripts?: number; findings?: number; detail?: boolean };

export async function encodeSnapshot(s: TraceSnapshot, o: Opts = {}): Promise<string> {
  const m = s.metrics;
  const payload: z.input<typeof Schema> = {
    v: 1,
    u: s.url?.slice(0, 500),
    m: [
      rn(m.ttfb),
      rn(m.fcp),
      rn(m.lcp),
      Math.round(m.cls * 10000) / 10000,
      r1(m.tbt),
      m.longTaskCount,
      r1(m.longTaskMs),
    ],
    c: FINDING_CATEGORIES.map((c) => r1(s.categoryMs[c])) as [
      number,
      number,
      number,
      number,
      number,
    ],
    f: s.findings
      .slice(0, o.findings ?? 30)
      .map((f) => ({
        s: f.severity,
        t: f.title.slice(0, 500),
        d: o.detail === false ? "" : f.detail.slice(0, 1000),
      })),
    s: s.topScripts
      .slice(0, Math.min(10, o.scripts ?? 10))
      .map((t) => [t.url.slice(0, 1000), r1(t.ms), t.count, r1(t.blockingMs)]),
  };
  return toB64Url(
    await pipe(
      new TextEncoder().encode(JSON.stringify(payload)),
      new CompressionStream("deflate-raw"),
    ),
  );
}

function fragment(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  return raw.startsWith(HASH_KEY) ? raw.slice(HASH_KEY.length) : null;
}
export const hasShareHash = (hash: string) => fragment(hash) !== null;

/** Accepts `#r=...`; returns null on anything invalid. */
export async function decodeSnapshot(hash: string): Promise<TraceSnapshot | null> {
  const enc = fragment(hash);
  if (!enc || enc.length > MAX_ENCODED_CHARS || !/^[A-Za-z0-9_-]+$/.test(enc)) return null;
  try {
    const text = new TextDecoder().decode(
      await pipe(fromB64Url(enc), new DecompressionStream("deflate-raw"), MAX_DECODED_BYTES),
    );
    const r = Schema.safeParse(JSON.parse(text));
    if (!r.success) return null;
    const p = r.data;
    const [ttfb, fcp, lcp, cls, tbt, longTaskCount, longTaskMs] = p.m;
    return {
      url: p.u,
      metrics: {
        ttfb: ttfb ?? undefined,
        fcp: fcp ?? undefined,
        lcp: lcp ?? undefined,
        cls,
        tbt,
        longTaskCount,
        longTaskMs,
      },
      categoryMs: Object.fromEntries(
        FINDING_CATEGORIES.map((c, i) => [c, p.c[i]]),
      ) as TraceSnapshot["categoryMs"],
      topScripts: p.s.map(([url, ms, count, blockingMs]) => ({ url, ms, count, blockingMs })),
      findings: p.f.map((f) => ({ severity: f.s, title: f.t, detail: f.d })),
      layoutShifts: [],
    };
  } catch {
    return null;
  }
}

/** `${origin}/trace#r=...`, shrinking (scripts, then findings detail) until under the cap. */
export async function buildShareUrl(
  origin: string,
  s: TraceSnapshot,
  maxChars = MAX_SHARE_URL_CHARS,
): Promise<string> {
  const make = async (o: Opts) => `${origin}/trace#${HASH_KEY}${await encodeSnapshot(s, o)}`;
  let url = await make({});
  for (const o of [
    { scripts: 5 },
    { scripts: 3, detail: false },
    { scripts: 0, detail: false },
    { scripts: 0, detail: false, findings: 10 },
  ]) {
    if (url.length <= maxChars) break;
    url = await make(o);
  }
  return url;
}
