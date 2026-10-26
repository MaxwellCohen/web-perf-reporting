const PRODUCTION_VIEWER_ORIGIN = "https://web-perf-report.vercel.app";

export type PsiViewerDeepLinkOptions = {
  label?: string;
  compareUrl?: string;
  compareLabel?: string;
};

/** Deep link that re-imports a PageSpeed Insights share URL into the viewer. */
export function buildPsiViewerDeepLink(
  psiUrl: string,
  origin: string,
  options: PsiViewerDeepLinkOptions = {},
): string {
  const url = new URL("/viewer", origin);
  url.searchParams.set("psi", psiUrl);
  const label = options.label?.trim();
  if (label) url.searchParams.set("psiLabel", label);
  const compareUrl = options.compareUrl?.trim();
  if (compareUrl) {
    url.searchParams.set("psi2", compareUrl);
    const compareLabel = options.compareLabel?.trim();
    if (compareLabel) url.searchParams.set("psi2Label", compareLabel);
  }
  return url.toString();
}

export function buildPsiViewerBookmarklet(): string {
  const target = `${PRODUCTION_VIEWER_ORIGIN}/viewer?psi=`;
  return `javascript:(()=>{const u=location.href;if(!/pagespeed\\.web\\.dev\\/analysis\\//.test(u)){alert('Open a PageSpeed Insights report first');return;}location.href=${JSON.stringify(target)}+encodeURIComponent(u);})();`;
}
