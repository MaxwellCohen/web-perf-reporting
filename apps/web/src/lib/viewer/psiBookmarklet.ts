const PRODUCTION_VIEWER_ORIGIN = "https://web-perf-report.vercel.app";

/** Deep link that re-imports a PageSpeed Insights share URL into the viewer. */
export function buildPsiViewerDeepLink(psiUrl: string, origin: string): string {
  const url = new URL("/viewer", origin);
  url.searchParams.set("psi", psiUrl);
  return url.toString();
}

export function buildPsiViewerBookmarklet(): string {
  const target = `${PRODUCTION_VIEWER_ORIGIN}/viewer?psi=`;
  return `javascript:(()=>{const u=location.href;if(!/pagespeed\\.web\\.dev\\/analysis\\//.test(u)){alert('Open a PageSpeed Insights report first');return;}location.href=${JSON.stringify(target)}+encodeURIComponent(u);})();`;
}
