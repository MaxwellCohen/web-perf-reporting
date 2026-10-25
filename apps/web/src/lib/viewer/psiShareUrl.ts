export class PsiShareUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PsiShareUrlError";
  }
}

export class PsiShareFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PsiShareFetchError";
  }
}

const SHARE_HOST = "pagespeed.web.dev";

export function parsePsiShareUrl(input: string): URL {
  const trimmed = input.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new PsiShareUrlError("Enter a PageSpeed Insights share URL");
  }

  if (url.protocol !== "https:") {
    throw new PsiShareUrlError("Share URL must use https");
  }
  if (url.username || url.password) {
    throw new PsiShareUrlError("Share URL must not include credentials");
  }
  if (url.port) {
    throw new PsiShareUrlError("Share URL must not include a custom port");
  }
  if (url.hostname !== SHARE_HOST) {
    throw new PsiShareUrlError("URL must be a pagespeed.web.dev analysis link");
  }
  if (!url.pathname.startsWith("/analysis/") || url.pathname === "/analysis/") {
    throw new PsiShareUrlError("URL must be a pagespeed.web.dev/analysis/ link");
  }

  return url;
}

const SHARE_FETCH_TIMEOUT_MS = 60_000;
const MAX_SHARE_REDIRECTS = 3;

export async function fetchPsiShareHtml(
  shareUrl: URL,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  let current = shareUrl;

  for (let attempt = 0; attempt <= MAX_SHARE_REDIRECTS; attempt++) {
    let response: Response;
    try {
      response = await fetchFn(current, {
        redirect: "manual",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "web-perf-reporting/psi-share",
        },
        signal: AbortSignal.timeout(SHARE_FETCH_TIMEOUT_MS),
      });
    } catch (error) {
      if (error instanceof PsiShareUrlError) throw error;
      const message = error instanceof Error ? error.message : "network error";
      throw new PsiShareFetchError(`Could not fetch PageSpeed share page: ${message}`);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new PsiShareFetchError("PageSpeed share page redirected without a location");
      }
      current = parsePsiShareUrl(new URL(location, current).toString());
      continue;
    }

    if (!response.ok) {
      throw new PsiShareFetchError(`PageSpeed share page returned ${response.status}`);
    }

    return response.text();
  }

  throw new PsiShareFetchError("PageSpeed share page redirected too many times");
}
