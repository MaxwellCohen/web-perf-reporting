/**
 * Origin for scripts and share links. Only a loopback Host (local dev) is honored; anything else uses the configured
 * site URL, so a forged Host/X-Forwarded-Host can never redirect uploads or links to another domain.
 */
export function requestOrigin(request: Request, fallback: string): string {
  const host = request.headers.get("host");
  if (process.env.NODE_ENV === "production" || !host || !/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host)) return fallback;
  const proto = new URL(request.url).protocol === "https:" ? "https" : "http";
  return `${proto}://${host}`;
}
