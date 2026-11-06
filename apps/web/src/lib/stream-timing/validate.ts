import { normalizeMeasurement } from "./analyze";
import type { StreamChunk, StreamMeasurement } from "./types";

const MAX_INPUT_CHUNKS = 50_000;
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

/** Validate untrusted input (request body or share fragment) and return a normalized measurement. */
export function parseMeasurement(input: unknown): StreamMeasurement | null {
  if (!input || typeof input !== "object") return null;
  const m = input as Record<string, unknown>;
  if (typeof m.url !== "string" || !num(m.headersMs) || !num(m.totalMs) || !Array.isArray(m.chunks)) return null;
  if (m.chunks.length > MAX_INPUT_CHUNKS) return null;
  const chunks: StreamChunk[] = [];
  for (const raw of m.chunks) {
    if (!raw || typeof raw !== "object") return null;
    const c = raw as Record<string, unknown>;
    if (!num(c.t) || !num(c.bytes)) return null;
    chunks.push({
      t: c.t,
      ...(num(c.end) && c.end > c.t ? { end: c.end } : {}),
      bytes: c.bytes,
      ...(typeof c.preview === "string" ? { preview: c.preview.slice(0, 80) } : {}),
      ...(c.late === true ? { late: true } : {}),
    });
  }
  const lastSeen = chunks.reduce((mx, c) => Math.max(mx, c.end ?? c.t), 0);
  return normalizeMeasurement({
    url: m.url,
    finalUrl: str(m.finalUrl),
    status: num(m.status) ? m.status : 0,
    contentType: str(m.contentType),
    contentEncoding: str(m.contentEncoding),
    measuredFrom: m.measuredFrom === "server" ? "server" : "local",
    startedAt: str(m.startedAt)?.slice(0, 40) ?? "",
    headersMs: m.headersMs,
    totalMs: Math.max(m.totalMs, lastSeen),
    chunks,
    lastByteMs: num(m.lastByteMs) && m.lastByteMs >= lastSeen ? m.lastByteMs : undefined,
    redirects: num(m.redirects) ? m.redirects : undefined,
    truncated: m.truncated === true ? true : undefined,
    coalesced: m.coalesced === true ? true : undefined,
  });
}
