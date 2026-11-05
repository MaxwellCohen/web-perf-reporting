export type JsonBodyResult =
  | { ok: true; body: unknown }
  | { ok: false; status: 400 | 413; reason: "invalid-json" | "too-large" };

/** Reads a JSON body, refusing anything over `maxBytes` before it is fully buffered. */
export async function readJsonLimited(request: Request, maxBytes: number): Promise<JsonBodyResult> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, status: 413, reason: "too-large" };
  }
  if (!request.body) return { ok: false, status: 400, reason: "invalid-json" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return { ok: false, status: 413, reason: "too-large" };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { ok: true, body: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { ok: false, status: 400, reason: "invalid-json" };
  }
}
