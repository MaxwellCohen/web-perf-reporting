export type JsonBodyResult =
  | { ok: true; body: unknown }
  | { ok: false; status: 400 | 413; reason: "invalid-json" | "invalid-gzip" | "too-large" };

export interface ReadJsonOptions {
  /** Decompress gzip bodies (magic-byte sniffed). Off by default so existing endpoints keep their behavior. */
  allowGzip?: boolean;
  /** Cap for the decompressed bytes; defaults to `maxBytes`. */
  maxDecompressedBytes?: number;
}

const GZIP_0 = 0x1f;
const GZIP_1 = 0x8b;

/** Chrome DevTools writes `.json.gz`; the magic bytes are authoritative, not the file name. */
function isGzip(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === GZIP_0 && bytes[1] === GZIP_1;
}

async function gunzip(bytes: Uint8Array, maxBytes: number): Promise<Uint8Array | "too-large" | "invalid-gzip"> {
  try {
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    });
    const reader = source
      .pipeThrough(new DecompressionStream("gzip") as unknown as TransformStream<Uint8Array, Uint8Array>)
      .getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return "too-large";
      }
      chunks.push(value);
    }
    const out = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      out.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return out;
  } catch {
    return "invalid-gzip";
  }
}

/**
 * Reads a JSON body, refusing anything over `maxBytes` before it is fully
 * buffered. When `allowGzip` is set, gzip bodies (`.json.gz` from DevTools) are
 * decompressed first and capped separately at `maxDecompressedBytes`; the
 * compressed upload still has to fit under `maxBytes`.
 */
export async function readJsonLimited(
  request: Request,
  maxBytes: number,
  options: ReadJsonOptions = {},
): Promise<JsonBodyResult> {
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
  let bytes: Uint8Array = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  if (options.allowGzip && isGzip(bytes)) {
    const result = await gunzip(bytes, options.maxDecompressedBytes ?? maxBytes);
    if (result === "too-large") return { ok: false, status: 413, reason: "too-large" };
    if (result === "invalid-gzip") return { ok: false, status: 400, reason: "invalid-gzip" };
    bytes = result;
  }

  try {
    return { ok: true, body: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { ok: false, status: 400, reason: "invalid-json" };
  }
}
