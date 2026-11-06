import { lookup as dnsLookup } from "node:dns";
import { isIP } from "node:net";

export class StreamUrlError extends Error {}

const ALLOWED_PORTS = new Set(["80", "443", "8080", "8443"]);

const LOCAL_HELP =
  "Server-side measurement only supports public hosts. For localhost run: curl -s <site>/measure-stream.mjs | node - <url>";

function privateV4(ip: string): boolean {
  const [a, b, c] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

/** Expand an IPv6 address to 8 hextets (handles `::` and a trailing dotted IPv4). */
function expandV6(ip: string): number[] | null {
  let addr = ip.toLowerCase().split("%")[0];
  const v4 = /(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(addr);
  if (v4) {
    const [a, b, c, d] = v4.slice(1).map(Number);
    addr = addr.slice(0, v4.index) + ((a << 8) | b).toString(16) + ":" + ((c << 8) | d).toString(16);
  }
  const [head, tail, extra] = addr.split("::");
  if (extra !== undefined) return null;
  const h = head ? head.split(":") : [];
  const t = tail === undefined ? [] : tail ? tail.split(":") : [];
  const fill = tail === undefined ? 0 : 8 - h.length - t.length;
  if (fill < 0 || (tail === undefined && h.length !== 8)) return null;
  const parts = [...h, ...Array<string>(fill).fill("0"), ...t].map((x) => parseInt(x, 16));
  return parts.length === 8 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 0xffff) ? parts : null;
}

/** True for loopback, private, link-local, multicast, reserved, tunnelling and mapped-private addresses. */
export function isPrivateIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return privateV4(ip);
  if (family !== 6) return true;
  const w = expandV6(ip);
  if (!w) return true;
  const v4 = (hi: number, lo: number) => privateV4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  // ::/80 covers unspecified, loopback and IPv4-compatible; ::ffff:0:0/96 is IPv4-mapped.
  if (w.slice(0, 5).every((x) => x === 0)) return w[5] === 0xffff ? v4(w[6], w[7]) : true;
  return (
    (w[0] & 0xfe00) === 0xfc00 || // fc00::/7 unique local
    (w[0] & 0xffc0) === 0xfe80 || // fe80::/10 link-local
    (w[0] & 0xffc0) === 0xfec0 || // fec0::/10 site-local
    w[0] >> 8 === 0xff || // multicast
    (w[0] === 0x0100 && w[1] === 0 && w[2] === 0 && w[3] === 0) || // 100::/64 discard
    (w[0] === 0x0064 && w[1] === 0xff9b) || // NAT64
    (w[0] === 0x2001 && (w[1] === 0 || w[1] === 0x0db8)) || // Teredo, documentation
    w[0] === 0x2002 // 6to4
  );
}

/** Syntactic checks on the URL. DNS is validated at connect time by `guardedLookup`. */
export function assertPublicHttpUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
  } catch {
    throw new StreamUrlError("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new StreamUrlError("Only http(s) URLs");
  if (url.username || url.password) throw new StreamUrlError("URL must not include credentials");
  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  if (!ALLOWED_PORTS.has(port)) throw new StreamUrlError("Server-side measurement only supports ports 80, 443, 8080 and 8443");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.+$/, "");
  // Node skips `lookup` for IP literals, so only the syntactic check protects them: refuse IPv6 literals outright.
  if (host.includes(":")) throw new StreamUrlError("IPv6 literal hosts are not supported; use a hostname");
  const isLiteral = isIP(host) !== 0;
  if (
    !host ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    (!isLiteral && !host.includes(".")) ||
    (isLiteral && isPrivateIp(host))
  ) {
    throw new StreamUrlError(LOCAL_HELP);
  }
  return url;
}

/**
 * `lookup` for http.request: resolves, rejects any private address, and returns the validated
 * address so the connection is pinned to it (no resolve-then-reconnect rebinding window).
 */
export function guardedLookup(
  hostname: string,
  options: { all?: boolean; family?: number },
  callback: (err: Error | null, address?: unknown, family?: number) => void,
): void {
  dnsLookup(hostname, { all: true, family: options.family, verbatim: true }, (err, addresses) => {
    if (err) return callback(err);
    if (!addresses.length || addresses.some((a) => isPrivateIp(a.address))) {
      return callback(new StreamUrlError(LOCAL_HELP));
    }
    if (options.all) return callback(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
}
