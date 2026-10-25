export function buildPsiViewerBookmarklet(siteUrl: string): string {
  const origin = siteUrl.replace(/\/$/, "");
  const target = `${origin}/viewer?psi=`;
  return `javascript:(()=>{const u=location.href;if(!/pagespeed\\.web\\.dev\\/analysis\\//.test(u)){alert('Open a PageSpeed Insights report first');return;}location.href=${JSON.stringify(target)}+encodeURIComponent(u);})();`;
}
