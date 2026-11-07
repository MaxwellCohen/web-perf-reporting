import { parseLighthouseViewerGistId } from "@/lib/viewer/lighthouseViewerGist";

/** True for a plain http(s) page URL that should be measured (not a PSI share or Viewer gist link). */
export function isSiteUrl(value: string): boolean {
  const trimmed = value.trim();
  if (parseLighthouseViewerGistId(trimmed)) return false;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return !(url.hostname === "pagespeed.web.dev" && url.pathname.startsWith("/analysis/"));
  } catch {
    return false;
  }
}
