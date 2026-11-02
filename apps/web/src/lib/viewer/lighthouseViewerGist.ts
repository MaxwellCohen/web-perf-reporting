const VIEWER_HOST = "googlechrome.github.io";
const VIEWER_PATH = "/lighthouse/viewer";
const GIST_ID = /^[a-f0-9]{8,64}$/i;
const GIST_FETCH_TIMEOUT_MS = 30_000;

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
  if (!url.pathname.replace(/\/+$/, "").startsWith(VIEWER_PATH)) return null;
  const id = url.searchParams.get("gist")?.trim() ?? "";
  return GIST_ID.test(id) ? id : null;
}

type GistFile = { filename?: string; content?: string; truncated?: boolean; raw_url?: string };

export async function fetchLighthouseViewerGist(
  gistId: string,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  if (!GIST_ID.test(gistId)) throw new LighthouseViewerGistError("Invalid gist id");

  const response = await fetchFn(`https://api.github.com/gists/${gistId}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "web-perf-reporting/lh-gist" },
    signal: AbortSignal.timeout(GIST_FETCH_TIMEOUT_MS),
  });
  if (response.status === 404) throw new LighthouseViewerGistError("Gist not found");
  if (!response.ok) throw new LighthouseViewerGistError(`GitHub returned ${response.status}`);

  const gist = (await response.json()) as { files?: Record<string, GistFile> };
  const files = Object.values(gist.files ?? {});
  const file = files.find((f) => f.filename?.endsWith(".json")) ?? files[0];
  if (!file) throw new LighthouseViewerGistError("Gist has no files");

  if (file.truncated && file.raw_url) {
    const raw = new URL(file.raw_url);
    if (raw.hostname !== "gist.githubusercontent.com") {
      throw new LighthouseViewerGistError("Unexpected gist file location");
    }
    const rawResponse = await fetchFn(raw, { signal: AbortSignal.timeout(GIST_FETCH_TIMEOUT_MS) });
    if (!rawResponse.ok) throw new LighthouseViewerGistError(`GitHub returned ${rawResponse.status}`);
    return rawResponse.text();
  }
  if (typeof file.content !== "string") throw new LighthouseViewerGistError("Gist file is empty");
  return file.content;
}
