import type { AuditResultsRecord, TableItem } from "@/lib/schema";
import { getNumber } from "@/lib/utils";
import { isNavigationRedirect } from "./simulatedThrottling";
import type {
  CriticalChainNode,
  ScriptCpu,
} from "@/features/page-speed-insights/shared/scriptResourceFacts";
import type { PreconnectCandidate, RawNetworkRequest } from "./timelineSourceTypes";
import { auditItems } from "./auditReaders";
import { coverageKeys } from "./codeCoverageSources";

function collectChainUrls(chains: Record<string, unknown>, out: string[] = []): string[] {
  for (const node of Object.values(chains)) {
    if (!node || typeof node !== "object") continue;
    const n = node as { url?: string; children?: Record<string, unknown> };
    if (typeof n.url === "string") out.push(n.url);
    if (n.children) collectChainUrls(n.children, out);
  }
  return out;
}

export function lookupKeyed<T>(map: Map<string, T>, url: string): T | undefined {
  for (const key of coverageKeys(url)) {
    const value = map.get(key);
    if (value) return value;
  }
  return undefined;
}

function rememberBest<T>(
  map: Map<string, T>,
  url: string,
  value: T,
  prefer: (current: T, next: T) => T,
): void {
  for (const key of coverageKeys(url)) {
    const existing = map.get(key);
    map.set(key, existing ? prefer(existing, value) : value);
  }
}

export function bootupCpuByUrl(audits: AuditResultsRecord | undefined): Map<string, ScriptCpu> {
  const map = new Map<string, ScriptCpu>();
  for (const item of auditItems(audits, "bootup-time")) {
    if (!item || typeof item !== "object") continue;
    const row = item as TableItem;
    const url = typeof row.url === "string" ? row.url : "";
    if (!url.startsWith("http")) continue;
    const totalMs = getNumber(row.total) ?? 0;
    const scriptingMs = getNumber(row.scripting) ?? 0;
    const parseMs = getNumber(row.scriptParseCompile) ?? 0;
    if (totalMs <= 0 && scriptingMs <= 0 && parseMs <= 0) continue;
    rememberBest(map, url, { totalMs, scriptingMs, parseMs }, (current, next) =>
      next.totalMs > current.totalMs ? next : current,
    );
  }
  return map;
}

type ChainWalkNode = {
  url?: string;
  navStartToEndTime?: number;
  isLongest?: boolean;
  children?: Record<string, ChainWalkNode>;
};

function preferChain(current: CriticalChainNode, next: CriticalChainNode): CriticalChainNode {
  if (next.isLongest && !current.isLongest) return next;
  if (current.isLongest && !next.isLongest) return current;
  return (next.endMs ?? 0) > (current.endMs ?? 0) ? next : current;
}

function rememberChainNodes(
  map: Map<string, CriticalChainNode>,
  chains: Record<string, ChainWalkNode> | undefined,
  parentEndMs: number | undefined,
): void {
  if (!chains) return;
  for (const node of Object.values(chains)) {
    if (!node || typeof node !== "object") continue;
    const endMs = getNumber(node.navStartToEndTime);
    if (typeof node.url === "string" && node.url.startsWith("http")) {
      const info: CriticalChainNode = {};
      if (endMs != null) info.endMs = endMs;
      if (parentEndMs != null && endMs != null) {
        const extendsMs = Math.max(0, endMs - parentEndMs);
        if (extendsMs > 0) info.extendsMs = extendsMs;
      }
      if (node.isLongest) info.isLongest = true;
      if (info.endMs != null || info.extendsMs != null || info.isLongest) {
        rememberBest(map, node.url, info, preferChain);
      }
    }
    rememberChainNodes(map, node.children, endMs ?? parentEndMs);
  }
}

export function parseDependencyTree(audits: AuditResultsRecord | undefined): {
  chainUrls: string[];
  chainByUrl: Map<string, CriticalChainNode>;
  longestChainMs?: number;
  preconnectedText?: string;
  preconnectCandidates: PreconnectCandidate[];
} {
  const details = audits?.["network-dependency-tree-insight"]?.details as
    | { items?: unknown[] }
    | undefined;
  const result = {
    chainUrls: [] as string[],
    chainByUrl: new Map<string, CriticalChainNode>(),
    longestChainMs: undefined as number | undefined,
    preconnectedText: undefined as string | undefined,
    preconnectCandidates: [] as PreconnectCandidate[],
  };
  if (!details?.items) return result;

  for (const section of details.items) {
    if (!section || typeof section !== "object") continue;
    const s = section as {
      type?: string;
      title?: string;
      value?: unknown;
    };

    if (s.type === "list-section" && s.value && typeof s.value === "object") {
      const value = s.value as {
        type?: string;
        value?: string;
        longestChain?: { duration?: number };
        chains?: Record<string, unknown>;
        items?: TableItem[];
      };

      if (value.type === "network-tree") {
        result.longestChainMs = getNumber(value.longestChain?.duration);
        result.chainUrls = collectChainUrls(value.chains ?? {});
        rememberChainNodes(
          result.chainByUrl,
          value.chains as Record<string, ChainWalkNode> | undefined,
          undefined,
        );
      } else if (value.type === "text" && typeof value.value === "string") {
        if (s.title?.toLowerCase().includes("preconnected")) {
          result.preconnectedText = value.value;
        }
      } else if (Array.isArray(value.items) && s.title?.toLowerCase().includes("preconnect")) {
        result.preconnectCandidates = value.items
          .map((item) => ({
            origin: typeof item.origin === "string" ? item.origin : "",
            wastedMs: getNumber(item.wastedMs) ?? 0,
          }))
          .filter((c) => c.origin);
      }
    }
  }

  return result;
}

export function redirectHops(
  requests: RawNetworkRequest[],
  document: RawNetworkRequest | undefined,
  auditUrls: string[],
): RawNetworkRequest[] {
  const documentStart = document?.networkRequestTime;
  const listed = new Set(auditUrls.filter((url) => url && url !== document?.url));
  return requests
    .filter((request) => {
      if (request.networkRequestTime == null || request.networkEndTime == null) return false;
      if (document && request === document) return false;
      if (documentStart != null && request.networkRequestTime > documentStart) return false;
      if (isNavigationRedirect(request.statusCode)) return true;
      return listed.has(request.url);
    })
    .sort((a, b) => (a.networkRequestTime ?? 0) - (b.networkRequestTime ?? 0));
}
