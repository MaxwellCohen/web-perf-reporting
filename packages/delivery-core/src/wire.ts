import dns from "node:dns";
import http from "node:http";
import http2 from "node:http2";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";
import vm from "node:vm";
import zlib from "node:zlib";

export const GOOGLEBOT_SMARTPHONE_UA =
  "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
export const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export type WireEnd = {
  kind: "complete" | "rst_stream" | "socket_close" | "timeout" | "error";
  code?: number | string;
  /** ms since the fetch started */
  atMs: number;
};

export type WireResult = {
  url: string;
  protocol: "h2" | "http/1.1";
  /** 0 when no response arrived */
  status: number;
  timings: { dnsMs: number; tcpMs: number; tlsMs: number; ttfbMs: number; totalMs: number };
  declaredBytes?: number;
  /** Bytes on the wire (compressed when content-encoding is set) */
  receivedBytes: number;
  contentEncoding?: string;
  end: WireEnd;
  /** false = the body is provably incomplete; null = could not tell */
  complete: boolean | null;
  check: "content-length" | "decode" | "js-parse" | "html-close" | "none";
  note?: string;
};

export type LookupFn = (
  hostname: string,
  options: { all?: boolean; family?: number },
  callback: (err: Error | null, address?: unknown, family?: number) => void,
) => void;

export type WireOptions = {
  userAgent?: string;
  lookup?: LookupFn;
  /** Called with every URL (including redirect targets) before it is fetched; throw to refuse. */
  assertUrl?: (url: string) => unknown;
  onKeylog?: (line: string) => void;
  /** Throttle reading to this many bytes/sec so server write/read timeouts can fire. */
  slowReadBytesPerSec?: number;
  /** Per-fetch timeout; default 10s */
  timeoutMs?: number;
  /** Absolute Date.now() deadline for this fetch */
  deadlineAt?: number;
  /** Redirects to follow (document only); default 0 */
  maxRedirects?: number;
  /** Speak HTTP/2 over cleartext (prior knowledge) for http: URLs. Tests and h2c servers. */
  h2c?: boolean;
  /** Share connections between fetches (one h2 session per origin). Caller closes it with closePool. */
  pool?: Map<string, Promise<Conn>>;
  /** Accept self-signed certificates */
  insecure?: boolean;
};

export type Conn = {
  alpn: "h2" | "http/1.1";
  socket: net.Socket;
  session?: http2.ClientHttp2Session;
  dnsMs: number;
  tcpMs: number;
  tlsMs: number;
};

const MAX_BODY_BYTES = 2_000_000;
const MAX_WIRE_BYTES = 10_000_000;
const RST_NAMES: Record<number, string> = {
  0: "NO_ERROR",
  1: "PROTOCOL_ERROR",
  2: "INTERNAL_ERROR",
  3: "FLOW_CONTROL_ERROR",
  4: "SETTINGS_TIMEOUT",
  5: "STREAM_CLOSED",
  6: "FRAME_SIZE_ERROR",
  7: "REFUSED_STREAM",
  8: "CANCEL",
  9: "COMPRESSION_ERROR",
  10: "CONNECT_ERROR",
  11: "ENHANCE_YOUR_CALM",
  12: "INADEQUATE_SECURITY",
  13: "HTTP_1_1_REQUIRED",
};
export const rstName = (code: number) => `${RST_NAMES[code] ?? "UNKNOWN"} (${code})`;

const now = () => performance.now();
const errCode = (e: unknown) => (e as { code?: string } | null)?.code;
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

function resolveHost(host: string, lookup: LookupFn | undefined): Promise<string> {
  if (net.isIP(host)) return Promise.resolve(host);
  return new Promise((resolve, reject) => {
    const cb = (err: Error | null, address?: unknown) => {
      if (err) return reject(err);
      const a = Array.isArray(address) ? address[0] : address;
      resolve(typeof a === "string" ? a : (a as { address: string }).address);
    };
    if (lookup) lookup(host, {}, cb);
    else dns.lookup(host, {}, cb as never);
  });
}

async function open(u: URL, o: WireOptions, limitMs: number): Promise<Conn> {
  const host = u.hostname.replace(/^\[|\]$/g, "");
  const secure = u.protocol === "https:";
  const port = Number(u.port) || (secure ? 443 : 80);
  let t = now();
  const address = await resolveHost(host, o.lookup);
  const dnsMs = now() - t;
  t = now();
  const raw = await new Promise<net.Socket>((resolve, reject) => {
    const s = net.connect({ host: address, port });
    // Covers TCP connect and the TLS handshake; cleared once the connection is usable.
    s.setTimeout(Math.max(1, limitMs), () => s.destroy(Object.assign(new Error("Connect timed out"), { code: "ETIMEDOUT" })));
    s.once("connect", () => resolve(s));
    s.once("error", reject);
  });
  const tcpMs = now() - t;
  let socket: net.Socket = raw;
  let tlsMs = 0;
  let alpn: Conn["alpn"] = o.h2c && !secure ? "h2" : "http/1.1";
  if (secure) {
    t = now();
    const ts = tls.connect({
      socket: raw,
      servername: net.isIP(host) ? undefined : host,
      ALPNProtocols: ["h2", "http/1.1"],
      rejectUnauthorized: !o.insecure,
    });
    ts.on("keylog", (line) => o.onKeylog?.(line.toString().trimEnd()));
    await new Promise<void>((resolve, reject) => {
      ts.once("secureConnect", () => resolve());
      ts.once("error", reject);
    }).catch((e) => {
      raw.destroy();
      throw e;
    });
    tlsMs = now() - t;
    socket = ts;
    alpn = ts.alpnProtocol === "h2" ? "h2" : "http/1.1";
  }
  raw.setTimeout(0);
  socket.on("error", () => {});
  const conn: Conn = { alpn, socket, dnsMs, tcpMs, tlsMs };
  if (alpn === "h2") {
    const slow = o.slowReadBytesPerSec !== undefined;
    conn.session = http2.connect(u.origin, {
      createConnection: () => socket,
      settings: slow ? { initialWindowSize: 1024 } : undefined,
    });
    conn.session.on("error", () => {});
  }
  return conn;
}

function closeConn(c: Conn) {
  c.session?.destroy();
  c.socket.destroy();
}

export async function closePool(pool: Map<string, Promise<Conn>>) {
  for (const p of pool.values()) await p.then(closeConn, () => {});
  pool.clear();
}

type Raw = {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  ttfbMs: number;
  wire: number;
  body: Buffer[];
  bodyBytes: number;
  bodyCapped: boolean;
  decodeError?: string;
  stoppedEarly: boolean;
  end: WireEnd;
};

const header = (h: Raw["headers"], k: string) => {
  const v = h[k];
  return Array.isArray(v) ? v[0] : v;
};

function exchange(c: Conn, u: URL, o: WireOptions, t0: number, limitMs: number): Promise<Raw> {
  return new Promise((resolve) => {
    const raw: Raw = {
      status: 0,
      headers: {},
      ttfbMs: 0,
      wire: 0,
      body: [],
      bodyBytes: 0,
      bodyCapped: false,
      stoppedEarly: false,
      end: { kind: "error", atMs: 0 },
    };
    const sentAt = now();
    let done = false;
    let ended = false;
    let err: unknown;
    let dec: zlib.Gunzip | zlib.BrotliDecompress | zlib.Inflate | undefined;
    let src: { pause(): unknown; resume(): unknown; destroy(): unknown } | undefined;
    const kill = () => {
      src?.destroy();
      if (!src) req.destroy();
    };
    const finish = (kind: WireEnd["kind"], code?: number | string) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      raw.end = { kind, code, atMs: now() - t0 };
      if (!dec || dec.destroyed) return resolve(raw);
      dec.once("close", () => resolve(raw));
      dec.end();
    };
    const timer = setTimeout(() => {
      finish("timeout", "ETIMEDOUT");
      kill();
    }, Math.max(1, limitMs));

    const keep = (b: Buffer) => {
      raw.bodyBytes += b.length;
      if (raw.bodyBytes > MAX_BODY_BYTES) raw.bodyCapped = true;
      else raw.body.push(b);
    };
    const onHeaders = (status: number, headers: Raw["headers"]) => {
      raw.status = status;
      raw.headers = headers;
      raw.ttfbMs = now() - sentAt;
      const ce = header(headers, "content-encoding")?.toLowerCase();
      dec = ce === "gzip" || ce === "x-gzip" ? zlib.createGunzip() : ce === "br" ? zlib.createBrotliDecompress() : ce === "deflate" ? zlib.createInflate() : undefined;
      dec?.on("data", keep).on("error", (e) => (raw.decodeError ??= e.message));
    };
    const onData = (b: Buffer) => {
      raw.wire += b.length;
      if (dec) dec.write(b);
      else keep(b);
      if (raw.wire > MAX_WIRE_BYTES) {
        raw.stoppedEarly = true;
        finish("complete");
        kill();
        return;
      }
      const bps = o.slowReadBytesPerSec;
      if (bps && src) {
        src.pause();
        setTimeout(() => src?.resume(), (b.length * 1000) / bps);
      }
    };
    const headers = {
      "user-agent": o.userAgent ?? GOOGLEBOT_SMARTPHONE_UA,
      accept: "*/*",
      "accept-encoding": "gzip, br",
    };

    let req: http.ClientRequest;
    if (c.session) {
      const stream = c.session.request({ ":path": u.pathname + u.search, ...headers });
      req = { destroy: () => stream.destroy() } as unknown as http.ClientRequest;
      src = stream;
      stream.on("response", (h) => onHeaders(Number(h[":status"]), h as Raw["headers"]));
      stream.on("data", onData);
      stream.on("end", () => (ended = true));
      stream.on("error", (e) => (err = e));
      stream.on("close", () => {
        const rc = stream.rstCode;
        if (ended && !rc) return finish("complete");
        const sockGone = c.socket.destroyed || c.session!.destroyed;
        if (rc && (errCode(err) === "ERR_HTTP2_STREAM_ERROR" || !sockGone)) return finish("rst_stream", rstName(rc));
        finish(sockGone ? "socket_close" : "error", errCode(err));
      });
      stream.end();
    } else {
      const mod = u.protocol === "https:" ? https : http;
      req = mod.request({
        createConnection: () => c.socket,
        host: u.hostname,
        port: u.port || undefined,
        path: u.pathname + u.search,
        headers,
        agent: false,
      });
      req.on("response", (res) => {
        src = res;
        onHeaders(res.statusCode ?? 0, res.headers as Raw["headers"]);
        res.on("data", onData);
        res.on("end", () => (ended = true));
        res.on("error", (e) => (err = e));
        res.on("close", () => (res.complete && ended ? finish("complete") : finish("socket_close", errCode(err))));
      });
      req.on("error", (e) => finish(raw.status ? "socket_close" : "error", errCode(e) ?? errMsg(e)));
      req.end();
    }
  });
}

function bodyVerdict(
  r: Raw,
  url: string,
  declared: number | undefined,
): Pick<WireResult, "complete" | "check" | "note"> {
  if (r.end.kind !== "complete") {
    return { complete: false, check: declared !== undefined ? "content-length" : r.decodeError ? "decode" : "none" };
  }
  if (r.stoppedEarly) return { complete: null, check: "none", note: "Stopped reading after 10 MB" };
  if (declared !== undefined && r.wire !== declared) return { complete: false, check: "content-length" };
  if (r.decodeError) return { complete: false, check: "decode", note: r.decodeError };
  const type = header(r.headers, "content-type")?.toLowerCase() ?? "";
  const path = new URL(url).pathname;
  const text = r.bodyCapped ? undefined : Buffer.concat(r.body).toString("utf8");
  if (text !== undefined && (/javascript|ecmascript/.test(type) || /\.m?js$/.test(path))) {
    try {
      new vm.Script(text); // compile only, never run
      return { complete: true, check: "js-parse" };
    } catch (e) {
      // Module syntax (import/export) fails to compile as a script and says nothing about truncation.
      if (/Unexpected end of input|Unterminated|missing \) after/i.test(errMsg(e))) {
        return { complete: false, check: "js-parse", note: errMsg(e) };
      }
    }
  }
  if (declared !== undefined) return { complete: true, check: "content-length" };
  if (text !== undefined && /html/.test(type)) {
    return /<\/html\s*>/i.test(text)
      ? { complete: true, check: "html-close" }
      : { complete: null, check: "html-close", note: "No </html> and no content-length" };
  }
  return { complete: null, check: "none", note: "No content-length or format check applies" };
}

/** fetchWire plus the decoded body (first 2 MB), for asset extraction. */
export async function fetchWireBody(rawUrl: string, o: WireOptions = {}): Promise<{ result: WireResult; body: string }> {
  const t0 = now();
  let url = rawUrl;
  let redirects = o.maxRedirects ?? 0;
  for (;;) {
    await o.assertUrl?.(url);
    const u = new URL(url);
    const limit = Math.min(o.timeoutMs ?? 10_000, (o.deadlineAt ?? Infinity) - Date.now());
    let conn: Conn | undefined;
    let reused = false;
    let fail: unknown;
    try {
      const pooled = o.pool?.get(u.origin);
      const existing = pooled && (await pooled.catch(() => undefined));
      if (existing && existing.alpn === "h2" && !existing.session!.destroyed && !existing.session!.closed) {
        conn = existing;
        reused = true;
      } else {
        const p = open(u, o, limit);
        if (o.pool && existing?.alpn !== "http/1.1") o.pool.set(u.origin, p);
        conn = await p;
      }
    } catch (e) {
      fail = e;
    }
    if (!conn) {
      const msg = errMsg(fail);
      return {
        body: "",
        result: {
          url,
          protocol: "http/1.1",
          status: 0,
          timings: { dnsMs: 0, tcpMs: 0, tlsMs: 0, ttfbMs: 0, totalMs: now() - t0 },
          receivedBytes: 0,
          end: { kind: "error", code: errCode(fail) ?? msg, atMs: now() - t0 },
          complete: null,
          check: "none",
          note: msg,
        },
      };
    }
    const raw = await exchange(conn, u, o, t0, limit - (now() - t0));
    if (!o.pool || conn.alpn !== "h2") closeConn(conn);
    const loc = header(raw.headers, "location");
    if (raw.status >= 300 && raw.status < 400 && loc && redirects-- > 0) {
      url = new URL(loc, url).href;
      continue;
    }
    const clHeader = header(raw.headers, "content-length");
    const declared = clHeader !== undefined && /^\d+$/.test(clHeader) ? Number(clHeader) : undefined;
    const verdict = bodyVerdict(raw, url, declared);
    return {
      body: Buffer.concat(raw.body).toString("utf8"),
      result: {
        url,
        protocol: conn.alpn,
        status: raw.status,
        timings: {
          dnsMs: reused ? 0 : conn.dnsMs,
          tcpMs: reused ? 0 : conn.tcpMs,
          tlsMs: reused ? 0 : conn.tlsMs,
          ttfbMs: raw.ttfbMs,
          totalMs: raw.end.atMs,
        },
        declaredBytes: declared,
        receivedBytes: raw.wire,
        contentEncoding: header(raw.headers, "content-encoding"),
        end: raw.end,
        ...verdict,
      },
    };
  }
}

export async function fetchWire(url: string, opts: WireOptions = {}): Promise<WireResult> {
  return (await fetchWireBody(url, opts)).result;
}
