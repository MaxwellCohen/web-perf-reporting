export interface ParsedUrlDisplay {
  path: string;
  hostLabel: string;
  hostname: string;
}

/**
 * Parse a URL string for display purposes. Returns null if the string is not a valid URL.
 */
export function parseUrlForDisplay(urlString: string): ParsedUrlDisplay | null {
  try {
    const url = new URL(urlString);
    const path = url.pathname === "/" ? url.origin : url.pathname;
    const hostLabel = url.pathname === "/" || url.hostname === "" ? "" : `(${url.hostname})`;
    return {
      path,
      hostLabel,
      hostname: url.hostname,
    };
  } catch {
    return null;
  }
}

/**
 * Host of a URL (hostname plus any non-default port). Returns fallback when the
 * string is not a URL or has no host (data:, file:, fragments).
 */
export function getHostFromUrl(urlString: string, fallback = "Unknown"): string {
  try {
    return new URL(urlString).host || fallback;
  } catch {
    return fallback;
  }
}
