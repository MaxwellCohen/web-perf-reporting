import type { AuditResultsRecord, TableItem } from "@/lib/schema";
import { getNumber } from "@/lib/utils";
import type { LayoutShiftEvent, UserTiming } from "./timelineSourceTypes";
import { auditItems } from "./auditReaders";

const SKIPPED_USER_TIMING_NAMES = new Set(["clearMarks", "clearMeasures"]);

function nodeLabelFromItem(item: TableItem): string | undefined {
  const node = item.node;
  if (!node || typeof node !== "object") return undefined;
  const label = (node as { nodeLabel?: unknown; value?: unknown }).nodeLabel;
  if (typeof label === "string" && label.trim()) return label;
  const value = (node as { value?: unknown }).value;
  if (typeof value === "string" && value.trim() && value !== "Total") return value;
  return undefined;
}

function layoutShiftFromItem(item: unknown): LayoutShiftEvent | null {
  if (!item || typeof item !== "object") return null;
  const row = item as TableItem;
  const startTime = getNumber(row.startTime);
  const score = getNumber(row.score);
  if (startTime == null || score == null) return null;
  const nodeLabel = nodeLabelFromItem(row);
  if (nodeLabel === "Total") return null;
  return { startTime, score, nodeLabel };
}

/** Timed shifts from layout-shifts and cls-culprits-insight (when startTime is present). */
export function layoutShifts(audits: AuditResultsRecord | undefined): LayoutShiftEvent[] {
  const fromTable = auditItems(audits, "layout-shifts")
    .map(layoutShiftFromItem)
    .filter((shift): shift is LayoutShiftEvent => shift != null);

  const fromCulprits: LayoutShiftEvent[] = [];
  const culpritDetails = audits?.["cls-culprits-insight"]?.details as
    | { type?: string; items?: unknown[] }
    | undefined;
  if (culpritDetails?.type === "list" && Array.isArray(culpritDetails.items)) {
    for (const entry of culpritDetails.items) {
      if (!entry || typeof entry !== "object") continue;
      const table = entry as { type?: string; items?: unknown[] };
      if (table.type !== "table" || !Array.isArray(table.items)) continue;
      for (const item of table.items) {
        const shift = layoutShiftFromItem(item);
        if (shift) fromCulprits.push(shift);
      }
    }
  }

  const merged = fromTable.length ? fromTable : fromCulprits;
  return merged.sort((a, b) => a.startTime - b.startTime || b.score - a.score);
}

export function userTimings(audits: AuditResultsRecord | undefined): UserTiming[] {
  return auditItems(audits, "user-timings")
    .filter((item): item is TableItem => !!item && typeof item === "object")
    .map((item) => ({
      name: typeof item.name === "string" ? item.name : "",
      timingType: typeof item.timingType === "string" ? item.timingType : "Mark",
      startTime: getNumber(item.startTime) ?? 0,
      duration: getNumber(item.duration),
    }))
    .filter((timing) => timing.name && !SKIPPED_USER_TIMING_NAMES.has(timing.name));
}
