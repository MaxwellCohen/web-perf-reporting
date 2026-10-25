export function buildPsiViewerBookmarklet(): string {
  
  const target = `https://web-perf-report.vercel.app/viewer?psi=`;
  return `javascript:(()=>{const u=location.href;if(!/pagespeed\\.web\\.dev\\/analysis\\//.test(u)){alert('Open a PageSpeed Insights report first');return;}location.href=${JSON.stringify(target)}+encodeURIComponent(u);})();`;
}
