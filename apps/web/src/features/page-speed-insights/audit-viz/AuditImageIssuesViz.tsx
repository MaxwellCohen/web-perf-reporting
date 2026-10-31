"use client";

import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import { shortUrl } from "@/features/page-speed-insights/shared/format";
import { getUrlString } from "@/lib/utils";
import { itemLabel } from "./auditItemValues";
import { AuditKpiStrip } from "./AuditKpiStrip";
import { hasAnyItems, reportLabel, rowItems, type DetailItem } from "./performanceVizShared";

export const IMAGE_ISSUE_AUDIT_IDS: ReadonlySet<string> = new Set([
  "unsized-images",
  "non-composited-animations",
  "image-size-responsive",
  "image-aspect-ratio",
]);

const COUNT_LABELS: Record<string, string> = {
  "unsized-images": "Images without dimensions",
  "non-composited-animations": "Non-composited animations",
  "image-size-responsive": "Images with wrong resolution",
  "image-aspect-ratio": "Images with wrong aspect ratio",
};

const DETAIL_KEYS: Record<string, Array<[string, string]>> = {
  "image-size-responsive": [
    ["displayedSize", "displayed"],
    ["actualSize", "actual"],
    ["expectedSize", "expected"],
  ],
  "image-aspect-ratio": [
    ["displayedAspectRatio", "displayed"],
    ["actualAspectRatio", "actual"],
  ],
};

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function imageIssueDescription(auditId: string, item: DetailItem): string {
  const parts: string[] = [];
  for (const [key, label] of DETAIL_KEYS[auditId] ?? []) {
    const value = str(item[key]);
    if (value) parts.push(`${label} ${value}`);
  }
  const reasons = (item.subItems?.items || [])
    .map((sub) => str(sub.failureReason))
    .filter((reason): reason is string => !!reason);
  if (reasons.length) parts.push(reasons.join("; "));
  return parts.join(" · ");
}

function itemName(item: DetailItem): string {
  const url = getUrlString(item.url);
  if (url) return shortUrl(url);
  return itemLabel(item, ["node"]);
}

const LIST_LIMIT = 8;

export function AuditImageIssuesViz({
  rows,
  auditId,
}: {
  rows: DetailTableItem[];
  auditId: string;
}) {
  if (!hasAnyItems(rows)) return null;
  const multi = rows.length > 1;
  const kpiLabel = COUNT_LABELS[auditId] ?? "Issues";

  return (
    <div className="mb-4 w-full min-w-0 space-y-3">
      <AuditKpiStrip
        groups={rows.map((row, index) => ({
          reportLabel: reportLabel(row, index),
          metrics: [{ label: kpiLabel, value: rowItems(row).length, format: "count" as const }],
        }))}
      />
      {rows.map((row, index) => {
        const items = rowItems(row).slice(0, LIST_LIMIT);
        if (!items.length) return null;
        const label = reportLabel(row, index);
        return (
          <div key={`${label}-${index}`} className="space-y-1">
            {multi ? <p className="text-xs font-medium text-muted-foreground">{label}</p> : null}
            <ul className="divide-y overflow-hidden rounded-md border text-sm">
              {items.map((item, i) => {
                const description = imageIssueDescription(auditId, item);
                return (
                  <li key={i} className="px-2.5 py-1.5">
                    <p className="truncate" title={itemName(item)}>
                      {itemName(item)}
                    </p>
                    {description ? (
                      <p className="truncate text-xs text-muted-foreground" title={description}>
                        {description}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {rowItems(row).length > LIST_LIMIT ? (
              <p className="text-xs text-muted-foreground">
                +{rowItems(row).length - LIST_LIMIT} more
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
