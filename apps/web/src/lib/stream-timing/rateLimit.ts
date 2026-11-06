const WINDOW_MS = 60_000;
const LIMIT_PER_WINDOW = 10;
const MAX_ACTIVE = 4;
const GLOBAL_LIMIT_PER_WINDOW = 60;
const MAX_KEYS = 5000;

const hits = new Map<string, number[]>();
let active = 0;
let globalHits: number[] = [];

/**
 * Platform-set headers (only trusted on Vercel, which overwrites them), else the Nth-from-last X-Forwarded-For hop
 * where N = STREAM_TRUSTED_PROXY_HOPS. Without either, forwarded headers are client-controlled and ignored: all
 * clients share one bucket (safe, but one user can use up the limit).
 */
export function clientKey(request: Request): string {
  const h = request.headers;
  const platform = process.env.VERCEL ? (h.get("x-vercel-forwarded-for") ?? h.get("x-real-ip")) : null;
  if (platform) return platform.trim();
  const n = Number(process.env.STREAM_TRUSTED_PROXY_HOPS);
  if (n >= 1) {
    const hops = h.get("x-forwarded-for")?.split(",");
    const hop = hops?.[hops.length - n]?.trim();
    if (hop) return hop;
  }
  return "unknown";
}

/** Best-effort per-instance limiter (serverless instances do not share it). Returns a release fn, or a reason. */
export function acquire(
  key: string,
  { concurrent = true, now = Date.now() }: { concurrent?: boolean; now?: number } = {},
): { release: () => void } | { reason: string } {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  // Global cap applies to real outbound measurements only. When no trusted client address exists ("unknown"),
  // callers share one key, so give it the global budget instead of letting one caller lock out everyone at 10.
  const perKey = key === "unknown" || key === "local:unknown" ? GLOBAL_LIMIT_PER_WINDOW : LIMIT_PER_WINDOW;
  if (concurrent) {
    globalHits = globalHits.filter((t) => now - t < WINDOW_MS);
    if (globalHits.length >= GLOBAL_LIMIT_PER_WINDOW) return { reason: "Rate limit: service is busy, retry shortly" };
  }
  if (recent.length >= perKey) return { reason: `Rate limit: ${perKey} requests per minute` };
  if (concurrent && active >= MAX_ACTIVE) return { reason: "Busy: too many measurements in flight, retry shortly" };
  recent.push(now);
  if (concurrent) globalHits.push(now);
  hits.set(key, recent);
  if (hits.size > MAX_KEYS) {
    for (const [k, v] of hits) if (now - v[v.length - 1] >= WINDOW_MS) hits.delete(k);
    // Still over (all keys fresh): evict oldest-inserted so memory stays bounded.
    for (const k of hits.keys()) {
      if (hits.size <= MAX_KEYS) break;
      hits.delete(k);
    }
  }
  if (concurrent) active++;
  let released = !concurrent;
  return {
    release: () => {
      if (!released) {
        released = true;
        active--;
      }
    },
  };
}
