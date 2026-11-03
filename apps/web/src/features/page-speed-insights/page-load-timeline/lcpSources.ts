import type { AuditResultsRecord, NodeValue, TableItem } from "@/lib/schema";
import { getNumber } from "@/lib/utils";
import type { LcpSegment } from "./types";
import type { LcpDiscoveryCheck, LcpSubpart } from "./timelineSourceTypes";

export function lcpSubparts(audits: AuditResultsRecord | undefined): LcpSubpart[] {
  const details = audits?.["lcp-breakdown-insight"]?.details as { items?: unknown[] } | undefined;
  if (!details?.items) return [];

  for (const entry of details.items) {
    if (!entry || typeof entry !== "object") continue;
    const table = entry as { type?: string; items?: TableItem[] };
    if (table.type !== "table" || !Array.isArray(table.items)) continue;

    return table.items
      .map((item) => ({
        subpart: typeof item.subpart === "string" ? item.subpart : "",
        label: typeof item.label === "string" ? item.label : "",
        duration: getNumber(item.duration) ?? 0,
      }))
      .filter((s) => s.subpart);
  }

  return [];
}

export function lcpElementNode(audits: AuditResultsRecord | undefined): NodeValue | undefined {
  const details = audits?.["lcp-breakdown-insight"]?.details as { items?: unknown[] } | undefined;
  if (!details?.items) return undefined;

  for (const entry of details.items) {
    if (!entry || typeof entry !== "object") continue;
    const node = entry as NodeValue;
    if (node.type === "node") return node;
  }

  return undefined;
}

export function lcpDiscoveryFailures(audits: AuditResultsRecord | undefined): LcpDiscoveryCheck[] {
  const details = audits?.["lcp-discovery-insight"]?.details as { items?: unknown[] } | undefined;
  if (!details?.items) return [];

  const failures: LcpDiscoveryCheck[] = [];
  for (const entry of details.items) {
    if (!entry || typeof entry !== "object") continue;
    const checklist = entry as {
      type?: string;
      items?: Record<string, { label?: string; value?: boolean }>;
    };
    if (checklist.type !== "checklist" || !checklist.items) continue;
    for (const [id, item] of Object.entries(checklist.items)) {
      if (!item || item.value !== false) continue;
      failures.push({
        id,
        label: typeof item.label === "string" ? item.label : id,
        value: false,
      });
    }
  }
  return failures;
}

export function buildLcpSegments(subparts: LcpSubpart[], lcpMs: number | undefined): LcpSegment[] {
  if (!subparts.length || lcpMs == null) return [];

  let cursor = 0;
  return subparts.map((s) => {
    const startMs = cursor;
    const endMs = cursor + s.duration;
    cursor = endMs;
    return {
      subpart: s.subpart,
      label: s.label,
      durationMs: s.duration,
      startMs,
      endMs,
    };
  });
}
