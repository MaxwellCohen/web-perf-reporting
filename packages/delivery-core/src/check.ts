import { isGhost } from "./render";
import { fetchWireBody, closePool, GOOGLEBOT_SMARTPHONE_UA, type Conn, type WireOptions, type WireResult } from "./wire";

const MAX_REDIRECTS = 5;
const CONCURRENCY = 4;
// Don't start a fetch that could only time out at once; report it as not checked instead.
const MIN_FETCH_MS = 50;

export type DeliveryReport = {
  url: string;
  finalUrl: string;
  userAgent: string;
  measuredFrom: "local" | "server";
  document: WireResult;
  /** Worst run per asset */
  assets: WireResult[];
  notChecked: string[];
  ghosts: number;
  startedAt: string;
};

export type DeliveryOptions = Pick<WireOptions, "lookup" | "assertUrl" | "onKeylog" | "slowReadBytesPerSec" | "userAgent" | "timeoutMs" | "h2c" | "insecure"> & {
  runs?: number;
  maxAssets?: number;
  /** Whole-check budget in ms; work not started by then is reported as not checked. */
  deadlineMs?: number;
  measuredFrom?: "local" | "server";
};

const rank = (r: WireResult) => (r.complete === false ? 3 : r.end.kind !== "complete" ? 2 : r.complete === null ? 1 : 0);
const worse = (a: WireResult, b: WireResult) => (rank(b) > rank(a) || (rank(b) === rank(a) && b.timings.totalMs > a.timings.totalMs) ? b : a);

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    out[m[1].toLowerCase()] ??= m[2] ?? m[3] ?? m[4] ?? "";
  }
  return out;
}

/** Same-document subresources a crawler must fetch to render: scripts, stylesheets, modulepreload, preloaded script/style. */
export function extractAssets(html: string, baseUrl: string, max: number): string[] {
  const found = new Set<string>();
  for (const [tag] of html.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
    if (found.size >= max) break;
    const a = attrs(tag.slice(1));
    let ref: string | undefined;
    if (/^<script/i.test(tag)) ref = a.src;
    else {
      const rel = (a.rel ?? "").toLowerCase().split(/\s+/);
      if (rel.includes("stylesheet") || rel.includes("modulepreload") || (rel.includes("preload") && (a.as === "script" || a.as === "style"))) ref = a.href;
    }
    if (!ref) continue;
    try {
      const u = new URL(ref, baseUrl);
      if (u.protocol === "http:" || u.protocol === "https:") {
        u.hash = "";
        found.add(u.href);
      }
    } catch {
      // unparsable reference
    }
  }
  return [...found];
}

/** Fetch the document and its subresources the way a crawler would, and flag 2xx responses whose body ended early. */
export async function checkDelivery(url: string, o: DeliveryOptions = {}): Promise<DeliveryReport> {
  const startedAt = new Date().toISOString();
  const runs = Math.max(1, Math.floor(o.runs ?? 1));
  const userAgent = o.userAgent ?? GOOGLEBOT_SMARTPHONE_UA;
  const deadlineAt = Date.now() + (o.deadlineMs ?? Infinity);
  const pool = new Map<string, Promise<Conn>>();
  const base: WireOptions = { ...o, userAgent, deadlineAt, pool };
  try {
    let document: WireResult | undefined;
    let body = "";
    for (let i = 0; i < runs; i++) {
      if (i > 0 && Date.now() >= deadlineAt) break;
      const r = await fetchWireBody(document?.url ?? url, { ...base, maxRedirects: i === 0 ? MAX_REDIRECTS : 0 });
      if (!document) body = r.body;
      document = document ? worse(document, r.result) : r.result;
    }
    const doc = document!;
    const urls = doc.status >= 200 && doc.status < 300 && body ? extractAssets(body, doc.url, o.maxAssets ?? 20) : [];
    const results = new Map<string, WireResult>();
    const notChecked: string[] = [];
    const tasks = urls.flatMap((u) => Array.from({ length: runs }, () => u));
    let next = 0;
    const worker = async () => {
      for (let t = next++; t < tasks.length; t = next++) {
        const u = tasks[t];
        if (deadlineAt - Date.now() < MIN_FETCH_MS) continue;
        try {
          const { result } = await fetchWireBody(u, base);
          const prev = results.get(u);
          results.set(u, prev ? worse(prev, result) : result);
        } catch (e) {
          if (!notChecked.some((n) => n.startsWith(`${u} `))) notChecked.push(`${u} (blocked: ${e instanceof Error ? e.message : String(e)})`);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, worker));
    for (const u of urls) if (!results.has(u) && !notChecked.some((n) => n.startsWith(`${u} `))) notChecked.push(`${u} (time budget exhausted)`);
    const assets = urls.flatMap((u) => results.get(u) ?? []);
    return {
      url,
      finalUrl: doc.url,
      userAgent,
      measuredFrom: o.measuredFrom ?? "local",
      document: doc,
      assets,
      notChecked,
      ghosts: [doc, ...assets].filter(isGhost).length,
      startedAt,
    };
  } finally {
    await closePool(pool);
  }
}
