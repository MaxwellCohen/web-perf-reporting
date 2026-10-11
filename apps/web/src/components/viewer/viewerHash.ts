import { parseViewerJsonEntries, parseViewerJsonString } from "@/components/viewer/parseViewerJson";
import { PageSpeedInsights } from "@/lib/schema";
import { TextEncoding } from "@/components/viewer/textEncoding";

const VIEWER_HASH_VERSION = 1;
const LOCAL_PREFIX = "local.";
const STORAGE_PREFIX = "viewer-report:";
const MAX_HASH_CHARS = 500_000;

export type ViewerHashState = {
  data: PageSpeedInsights[];
  labels: string[];
};

type ViewerHashPayload = {
  v: typeof VIEWER_HASH_VERSION;
  data: PageSpeedInsights[];
  labels: string[];
};

function fragmentFromHash(hash: string): string {
  if (!hash || hash === "#") return "";
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function isPayload(value: unknown): value is ViewerHashPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as ViewerHashPayload;
  return (
    candidate.v === VIEWER_HASH_VERSION &&
    Array.isArray(candidate.data) &&
    Array.isArray(candidate.labels)
  );
}

function decodeJsonText(text: string): ViewerHashState | null {
  const parsed: unknown = JSON.parse(text);
  if (isPayload(parsed)) {
    return {
      data: parseViewerJsonEntries(parsed.data),
      labels: parsed.labels,
    };
  }
  const data = Array.isArray(parsed) ? parseViewerJsonEntries(parsed) : parseViewerJsonString(text);
  if (!data.length) return null;
  return {
    data,
    labels: data.map((_, index) => `Report ${index + 1}`),
  };
}

export async function decodeViewerHash(hash: string): Promise<ViewerHashState | null> {
  const fragment = fragmentFromHash(hash);
  if (!fragment) return null;

  if (fragment.startsWith(LOCAL_PREFIX)) {
    const stored = sessionStorage.getItem(STORAGE_PREFIX + fragment.slice(LOCAL_PREFIX.length));
    if (!stored) return null;
    try {
      return decodeJsonText(stored);
    } catch {
      return null;
    }
  }

  try {
    return decodeJsonText(await TextEncoding.fromBase64(fragment, { gzip: true }));
  } catch {
    return null;
  }
}

async function shortId(text: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 16);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export async function encodeViewerHash(state: ViewerHashState): Promise<string> {
  const json = JSON.stringify({
    v: VIEWER_HASH_VERSION,
    data: state.data,
    labels: state.labels,
  } satisfies ViewerHashPayload);
  const encoded = await TextEncoding.toBase64(json, { gzip: true });

  if (encoded.length <= MAX_HASH_CHARS) {
    return encoded;
  }

  const id = await shortId(json);
  sessionStorage.setItem(STORAGE_PREFIX + id, json);
  return `${LOCAL_PREFIX}${id}`;
}
