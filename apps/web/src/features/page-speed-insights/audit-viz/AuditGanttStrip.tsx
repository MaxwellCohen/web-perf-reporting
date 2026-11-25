import { formatMs, shortUrl } from "@/features/page-speed-insights/shared/format";
import { itemLabel, itemNumeric } from "./auditItemValues";
import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import type { OpportunityItem, TableItem } from "@/lib/schema";
import { cn } from "@/lib/utils";

type GanttRow = {
  id: string;
  label: string;
  start: number;
  duration: number;
  end: number;
};

function rowsFromItems(
  items: Array<TableItem | OpportunityItem>,
  opts: {
    labelKeys: readonly string[];
    startKey: string;
    durationKey: string;
    limit: number;
  },
): GanttRow[] {
  return items
    .map((item, index) => {
      const start = itemNumeric(item, [opts.startKey]) ?? 0;
      const duration = itemNumeric(item, [opts.durationKey]) ?? 0;
      if (duration <= 0 && start < 0) return null;
      return {
        id: `${index}`,
        label: itemLabel(item, opts.labelKeys),
        start,
        duration: Math.max(duration, 0),
        end: start + Math.max(duration, 0),
      };
    })
    .filter((row): row is GanttRow => row != null)
    .sort((a, b) => b.duration - a.duration || a.start - b.start)
    .slice(0, opts.limit);
}

/** Label, track and duration columns, shared by the bar rows and the axis so they line up. */
const GANTT_GRID = "grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)_3.5rem] items-center gap-2";
const TICK_COUNT = 5;

/** Time scale under a group's bars: evenly spaced ticks from the first task start to the last task end. */
function GanttAxis({ minStart, range }: { minStart: number; range: number }) {
  return (
    <div className={GANTT_GRID} data-testid="gantt-axis">
      <p className="text-[11px] text-muted-foreground">Time since page load started</p>
      <div className="relative h-5 border-t border-border">
        {Array.from({ length: TICK_COUNT }, (_, index) => {
          const fraction = index / (TICK_COUNT - 1);
          const isFirst = index === 0;
          const isLast = index === TICK_COUNT - 1;
          return (
            <span
              key={index}
              className={cn(
                "absolute top-0 border-l border-border pt-1 pl-1 font-mono text-[11px] leading-none tabular-nums text-muted-foreground",
                isLast && "-translate-x-full border-r border-l-0 pr-1 pl-0",
                // A narrow track only has room for the start, middle and end.
                !isFirst && !isLast && index % 2 === 1 && "hidden sm:block",
              )}
              style={{ left: `${fraction * 100}%` }}
            >
              {formatMs(minStart + fraction * range)}
            </span>
          );
        })}
      </div>
      <span />
    </div>
  );
}

export function AuditGanttStrip({
  rows,
  labelKeys = ["name", "url"],
  startKey = "startTime",
  durationKey = "duration",
  limit = 20,
  title,
  barClassName = "bg-primary/80",
}: {
  rows: DetailTableItem[];
  labelKeys?: readonly string[];
  startKey?: string;
  durationKey?: string;
  limit?: number;
  title?: string;
  barClassName?: string;
}) {
  const groups = rows
    .map((row) => ({
      reportLabel: row._userLabel || "Report",
      items: rowsFromItems(row.auditResult?.details?.items || [], {
        labelKeys,
        startKey,
        durationKey,
        limit,
      }),
    }))
    .filter((group) => group.items.length > 0);

  if (!groups.length) return null;

  const multi = groups.length > 1;

  return (
    <div className="w-full min-w-0 space-y-4">
      {title ? <p className="text-sm font-medium text-muted-foreground">{title}</p> : null}
      <p className="text-xs text-muted-foreground">
        Each bar shows when the task ran and how long it took. The number on the right is its
        duration.
      </p>
      {groups.map((group) => {
        const minStart = Math.min(...group.items.map((item) => item.start));
        const maxEnd = Math.max(...group.items.map((item) => item.end), minStart + 1);
        const range = Math.max(maxEnd - minStart, 1);

        return (
          <div key={group.reportLabel} className="space-y-2">
            {multi ? (
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {group.reportLabel}
              </p>
            ) : null}
            <ul className="space-y-1.5">
              {group.items.map((item) => {
                const left = ((item.start - minStart) / range) * 100;
                const width = Math.max((item.duration / range) * 100, 0.4);
                return (
                  <li key={`${group.reportLabel}-${item.id}-${item.label}`} className={GANTT_GRID}>
                    <p className="truncate text-xs" title={item.label}>
                      {item.label.startsWith("http") ? shortUrl(item.label) : item.label}
                    </p>
                    <div className="relative h-3 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("absolute inset-y-0 rounded-full", barClassName)}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        title={`${formatMs(item.start)} → ${formatMs(item.end)} (${formatMs(item.duration)})`}
                      />
                    </div>
                    <p className="text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                      {formatMs(item.duration)}
                    </p>
                  </li>
                );
              })}
            </ul>
            <GanttAxis minStart={minStart} range={range} />
          </div>
        );
      })}
    </div>
  );
}

/** Redirect / chain steps as sequential wastedMs bars. */
export function AuditRedirectChain({ rows }: { rows: DetailTableItem[] }) {
  const groups = rows
    .map((row) => {
      const items = (row.auditResult?.details?.items || []).map((item, index) => ({
        id: `${index}`,
        label: itemLabel(item, ["url"]),
        wastedMs: itemNumeric(item, ["wastedMs"]) ?? 0,
      }));
      return { reportLabel: row._userLabel || "Report", items };
    })
    .filter((group) => group.items.length > 0);

  if (!groups.length) return null;

  return (
    <div className="w-full min-w-0 space-y-3">
      <p className="text-sm font-medium text-muted-foreground">Redirect chain</p>
      {groups.map((group) => {
        const max = Math.max(...group.items.map((item) => item.wastedMs), 1);
        return (
          <div key={group.reportLabel} className="space-y-2">
            {groups.length > 1 ? (
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {group.reportLabel}
              </p>
            ) : null}
            <ol className="space-y-2">
              {group.items.map((item, index) => (
                <li
                  key={`${group.reportLabel}-${item.id}`}
                  className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2"
                >
                  <span className="text-xs text-muted-foreground">{index + 1}.</span>
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-xs" title={item.label}>
                      {item.label}
                    </p>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-amber-500/80"
                        style={{ width: `${Math.max((item.wastedMs / max) * 100, 4)}%` }}
                      />
                    </div>
                  </div>
                  <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {formatMs(item.wastedMs)}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </div>
  );
}
