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
 * Extract hostname from a URL string. Returns fallback if parsing fails.
 */
export function getHostnameFromUrl(urlString: string, fallback = "Unknown"): string {
  const parsed = parseUrlForDisplay(urlString);
  return parsed?.hostname ?? fallback;
}
