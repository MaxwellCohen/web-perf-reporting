const VIEWER_HOST = "googlechrome.github.io";
const VIEWER_PATH = "/lighthouse/viewer";
const GIST_ID = /^[a-f0-9]{8,64}$/i;
const VIEWER_PATHS = new Set([VIEWER_PATH, `${VIEWER_PATH}/index.html`]);
const GIST_FETCH_TIMEOUT_MS = 30_000;
const MAX_GIST_FILE_BYTES = 20 * 1024 * 1024;
const FILE_TOO_LARGE = "Gist file is too large (limit 20 MB)";
const RATE_LIMITED = "GitHub rate limit reached, try again later";

export class LighthouseViewerGistError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LighthouseViewerGistError";
  }
}

/** Gist id from an official Lighthouse Viewer share link (`?gist=ID`), else null. */
export function parseLighthouseViewerGistId(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.hostname !== VIEWER_HOST) return null;
  if (!VIEWER_PATHS.has(url.pathname.replace(/\/+$/, ""))) return null;
  const id = url.searchParams.get("gist")?.trim() ?? "";
  return GIST_ID.test(id) ? id : null;
}

type GistFile = {
  filename?: string;
  content?: string;
  truncated?: boolean;
  raw_url?: string;
  size?: number;
};

function checkGitHubStatus(response: Response) {
  if (response.status === 404) throw new LighthouseViewerGistError("Gist not found");
  if (response.status === 429) throw new LighthouseViewerGistError(RATE_LIMITED);
  if (response.status === 403) {
    const limited =
      response.headers.get("x-ratelimit-remaining") === "0" || response.headers.has("retry-after");
    throw new LighthouseViewerGistError(limited ? RATE_LIMITED : "GitHub denied access to this gist");
  }
  if (!response.ok) throw new LighthouseViewerGistError(`GitHub returned ${response.status}`);
}

export async function fetchLighthouseViewerGist(
  gistId: string,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  if (!GIST_ID.test(gistId)) throw new LighthouseViewerGistError("Invalid gist id");

  const token = process.env.GITHUB_TOKEN;
  const response = await fetchFn(`https://api.github.com/gists/${gistId}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "web-perf-reporting/lh-gist",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(GIST_FETCH_TIMEOUT_MS),
  });
  checkGitHubStatus(response);

  const gist = (await response.json()) as { files?: Record<string, GistFile> };
  const files = Object.values(gist.files ?? {});
  const file = files.find((f) => f.filename?.endsWith(".json")) ?? files[0];
  if (!file) throw new LighthouseViewerGistError("Gist has no files");

  if (typeof file.size === "number" && file.size > MAX_GIST_FILE_BYTES) {
    throw new LighthouseViewerGistError(FILE_TOO_LARGE);
  }

  if (file.truncated && file.raw_url) {
    const raw = new URL(file.raw_url);
    if (raw.hostname !== "gist.githubusercontent.com") {
      throw new LighthouseViewerGistError("Unexpected gist file location");
    }
    const rawResponse = await fetchFn(raw, { signal: AbortSignal.timeout(GIST_FETCH_TIMEOUT_MS) });
    checkGitHubStatus(rawResponse);
    const length = Number(rawResponse.headers.get("content-length"));
    if (length > MAX_GIST_FILE_BYTES) throw new LighthouseViewerGistError(FILE_TOO_LARGE);
    return readTextWithCap(rawResponse, MAX_GIST_FILE_BYTES);
  }
  if (typeof file.content !== "string") throw new LighthouseViewerGistError("Gist file is empty");
  return file.content;
}

/** Read a response body as text, aborting as soon as it exceeds `maxBytes` (bytes, not characters). */
async function readTextWithCap(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).length > maxBytes) throw new LighthouseViewerGistError(FILE_TOO_LARGE);
    return text;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      throw new LighthouseViewerGistError(FILE_TOO_LARGE);
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}
