"use client";

import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import { cn } from "@/lib/utils";
import { itemNumeric } from "./auditItemValues";
import { hasAnyItems, reportLabel, rowItems } from "./performanceVizShared";

/** Lighthouse server-response-time target. */
const SERVER_RESPONSE_THRESHOLD_MS = 600;

export function AuditServerResponseTimeViz({ rows }: { rows: DetailTableItem[] }) {
  if (!hasAnyItems(rows)) return null;

  const entries = rows.map((row, index) => {
    const ms = rowItems(row).reduce(
      (max, item) => Math.max(max, itemNumeric(item, ["responseTime"]) ?? 0),
      0,
    );
    return { label: reportLabel(row, index), ms, present: rowItems(row).length > 0 };
  });
  const scaleMax = Math.max(SERVER_RESPONSE_THRESHOLD_MS * 1.5, ...entries.map((e) => e.ms * 1.1));
  const thresholdPct = (SERVER_RESPONSE_THRESHOLD_MS / scaleMax) * 100;
  const multi = rows.length > 1;

  return (
    <div className="mb-4 w-full min-w-0 space-y-2">
      <p className="text-sm font-medium text-muted-foreground">
        Root document response time vs {SERVER_RESPONSE_THRESHOLD_MS} ms threshold
      </p>
      {entries.map((entry) => {
        const good = entry.ms <= SERVER_RESPONSE_THRESHOLD_MS;
        return (
          <div key={entry.label} className="space-y-1" data-testid="server-response-row">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              {multi ? <span className="font-medium">{entry.label}</span> : <span />}
              {entry.present ? (
                <span
                  className={cn(
                    "font-mono font-semibold tabular-nums",
                    good ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                  )}
                >
                  {formatMs(entry.ms)} · {good ? "Good" : "Slow"}
                </span>
              ) : (
                <span className="text-muted-foreground">No data</span>
              )}
            </div>
            <div className="relative h-3 w-full rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", good ? "bg-emerald-500" : "bg-red-500")}
                style={{ width: `${Math.min(100, (entry.ms / scaleMax) * 100)}%` }}
              />
              <div
                className="absolute inset-y-[-3px] w-0.5 bg-foreground/70"
                style={{ left: `${thresholdPct}%` }}
                title={`${SERVER_RESPONSE_THRESHOLD_MS} ms threshold`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
