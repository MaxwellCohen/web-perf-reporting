"use client";

import { InteractiveWaterfall } from "@/features/page-speed-insights/waterfall/InteractiveWaterfall";
import {
  buildWaterfallRows,
  getWaterfallTimeRange,
} from "@/features/page-speed-insights/waterfall/waterfallData";
import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import type { TableItem } from "@/lib/schema";

const MAX_ROWS = 80;

export function AuditNetworkWaterfallViz({ rows }: { rows: DetailTableItem[] }) {
  const groups = rows
    .map((row) => {
      const items = (row.auditResult?.details?.items || []) as TableItem[];
      const waterfallRows = buildWaterfallRows(items).slice(0, MAX_ROWS);
      const timeRange = getWaterfallTimeRange(waterfallRows);
      return {
        reportLabel: row._userLabel || "Report",
        waterfallRows,
        timeRange,
      };
    })
    .filter((group) => group.waterfallRows.length > 0 && group.timeRange);

  if (!groups.length) return null;

  return (
    <div className="w-full min-w-0 space-y-4">
      <p className="text-sm font-medium text-muted-foreground">Request waterfall</p>
      {groups.map((group) => (
        <div key={group.reportLabel} className="w-full min-w-0 space-y-2">
          {groups.length > 1 ? (
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {group.reportLabel}
            </p>
          ) : null}
          <InteractiveWaterfall
            rows={group.waterfallRows}
            timeRange={group.timeRange!}
            heightSize="default"
            emptyMessage="No network timing data"
          />
        </div>
      ))}
    </div>
  );
}
