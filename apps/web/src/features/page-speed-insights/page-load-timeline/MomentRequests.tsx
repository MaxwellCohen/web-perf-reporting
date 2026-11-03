"use client";

import { ResourceUrlCell } from "@/features/page-speed-insights/shared/ResourceUrlCell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMs, formatNetworkPriority } from "@/features/page-speed-insights/shared/format";
import {
  chainLabel,
  scriptCpuLabel,
} from "@/features/page-speed-insights/shared/scriptResourceFacts";
import { RenderBlockingBadge } from "@/features/page-speed-insights/waterfall/renderBlockingBadge";
import { WaterfallBarTrack } from "@/features/page-speed-insights/waterfall/WaterfallBarTrack";
import {
  waterfallRowFromTimelineBar,
  type WaterfallRowKind,
} from "@/features/page-speed-insights/waterfall/waterfallData";
import { cn } from "@/lib/cn";
import { UNATTRIBUTED_LABEL, UnattributedLabel } from "./UnattributedLabel";
import type { TimelineTable, TimelineWaterfallBar } from "./types";

function barTimingLabel(bar: TimelineWaterfallBar, row: TimelineTable["rows"][number] | undefined) {
  const range = `${formatMs(bar.startMs)}–${formatMs(bar.endMs)}`;
  const startLabel = formatMs(bar.startMs);
  const extras = (row ?? [])
    .slice(1)
    .map((cell) => cell.text)
    .filter((text) => text.length > 0 && text !== startLabel);
  return extras.length ? `${range} · ${extras.join(" · ")}` : range;
}

function scriptDownloadLabel(bar: TimelineWaterfallBar): string | null {
  const window =
    bar.downloadStartMs != null && bar.downloadEndMs != null
      ? `${formatMs(bar.downloadStartMs)}–${formatMs(bar.downloadEndMs)}`
      : null;
  const download = window
    ? `downloaded ${window}${bar.downloadDuration ? ` (${bar.downloadDuration})` : ""}`
    : bar.downloadDuration
      ? `downloaded in ${bar.downloadDuration}`
      : null;
  const parts = [bar.scriptSize, download].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(" · ") : null;
}

function BarIdentity({ bar }: { bar: TimelineWaterfallBar }) {
  if (bar.href) return <ResourceUrlCell url={bar.href} />;
  if (bar.label === UNATTRIBUTED_LABEL) return <UnattributedLabel />;
  return (
    <p className="truncate text-[11px] text-muted-foreground" title={bar.label}>
      {bar.label}
    </p>
  );
}

function WaterfallRows({
  bars,
  table,
  axisEnd,
  showBlockingBadge,
  rowKind = "request",
}: {
  bars: TimelineWaterfallBar[];
  table?: TimelineTable;
  axisEnd: number;
  showBlockingBadge: boolean;
  rowKind?: WaterfallRowKind;
}) {
  const scale = axisEnd > 0 ? axisEnd : Math.max(...bars.map((b) => b.endMs), 1);

  return (
    <div className="space-y-2" data-testid="moment-waterfall">
      {bars.map((bar, index) => {
        const downloadLabel = scriptDownloadLabel(bar);
        const cpuLabel = scriptCpuLabel(bar.scriptCpu);
        const chainText = chainLabel(bar.chain);
        const kind: WaterfallRowKind =
          rowKind === "task" || bar.taskKind != null || bar.resourceType === "Task"
            ? "task"
            : "request";
        const row = waterfallRowFromTimelineBar(bar, kind);
        return (
          <div key={bar.id} className="space-y-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
                  <span>{bar.resourceType ?? (kind === "task" ? "Task" : "Request")}</span>
                  {showBlockingBadge && bar.renderBlocking ? (
                    <RenderBlockingBadge status={bar.renderBlocking} />
                  ) : null}
                  {bar.criticalPath ? (
                    <span className="rounded bg-amber-500/15 px-1 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                      Critical path
                    </span>
                  ) : null}
                </div>
                <BarIdentity bar={bar} />
                {bar.priority ? (
                  <p className="text-[11px] text-muted-foreground">
                    Priority {formatNetworkPriority(bar.priority)}
                  </p>
                ) : null}
                {downloadLabel ? (
                  <p className="text-[11px] tabular-nums text-muted-foreground">{downloadLabel}</p>
                ) : null}
                {cpuLabel ? (
                  <p className="text-[11px] tabular-nums text-muted-foreground">{cpuLabel}</p>
                ) : null}
                {chainText ? (
                  <p className="text-[11px] tabular-nums text-muted-foreground">{chainText}</p>
                ) : null}
                {bar.coverage ? (
                  <p className="text-[11px] tabular-nums text-muted-foreground">{bar.coverage}</p>
                ) : null}
                {bar.linkWarning ? (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">
                    {bar.linkWarning}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 pt-0.5 text-right text-[11px] tabular-nums text-muted-foreground">
                {barTimingLabel(bar, table?.rows[index])}
              </span>
            </div>
            <WaterfallBarTrack row={row} minStart={0} maxEnd={scale} height={8} />
          </div>
        );
      })}
    </div>
  );
}

function CollapsedUrlTable({ table, count }: { table: TimelineTable; count: number }) {
  return (
    <details className="group mt-2 rounded-md border border-border/70 bg-muted/20">
      <summary className="cursor-pointer list-none px-2.5 py-1.5 text-xs font-medium text-muted-foreground marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-1.5">
          <span className="text-foreground/80">URLs</span>
          <span className="tabular-nums text-muted-foreground">({count})</span>
          <span className="text-[10px] font-normal opacity-70 group-open:hidden">show</span>
          <span className="hidden text-[10px] font-normal opacity-70 group-open:inline">hide</span>
        </span>
      </summary>
      <div className="border-t border-border/60 px-1 pb-1">
        <Table className="text-xs" wrapperClassName="mt-0">
          <TableHeader>
            <TableRow>
              {table.headers.map((header) => (
                <TableHead
                  key={header.text}
                  className={cn(
                    "h-8 px-2 py-1 text-[11px]",
                    header.align === "end" && "text-right",
                  )}
                >
                  {header.text}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <TableCell
                    key={`${rowIndex}-${cellIndex}`}
                    className={cn(
                      "px-2 py-1.5",
                      cell.align === "end" && "whitespace-nowrap text-right font-mono tabular-nums",
                      cellIndex === 0 && "w-[52%] max-w-0",
                    )}
                  >
                    {cell.href ? (
                      <ResourceUrlCell url={cell.href} />
                    ) : cell.text === UNATTRIBUTED_LABEL ? (
                      <UnattributedLabel />
                    ) : (
                      cell.text
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </details>
  );
}

export function MomentRequests({
  bars,
  table,
  axisEnd,
  showBlockingBadge,
  summaryLabel = "Requests",
  rowKind = "request",
}: {
  bars?: TimelineWaterfallBar[];
  table?: TimelineTable;
  axisEnd: number;
  showBlockingBadge: boolean;
  summaryLabel?: string;
  rowKind?: WaterfallRowKind;
}) {
  const waterfall = bars ?? [];
  const rowCount = table?.rows.length ?? 0;

  if (waterfall.length > 1) {
    return (
      <details className="group mt-2 rounded-md border border-border/70 bg-muted/20">
        <summary className="cursor-pointer list-none px-2.5 py-1.5 text-xs font-medium text-muted-foreground marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-1.5">
            <span className="text-foreground/80">{summaryLabel}</span>
            <span className="tabular-nums text-muted-foreground">({waterfall.length})</span>
            <span className="text-[10px] font-normal opacity-70 group-open:hidden">show</span>
            <span className="hidden text-[10px] font-normal opacity-70 group-open:inline">
              hide
            </span>
          </span>
        </summary>
        <div className="border-t border-border/60 px-2.5 py-2.5">
          <WaterfallRows
            bars={waterfall}
            table={table}
            axisEnd={axisEnd}
            showBlockingBadge={showBlockingBadge}
            rowKind={rowKind}
          />
        </div>
      </details>
    );
  }

  if (waterfall.length === 1) {
    return (
      <div className="mt-2">
        <WaterfallRows
          bars={waterfall}
          table={table}
          axisEnd={axisEnd}
          showBlockingBadge={showBlockingBadge}
          rowKind={rowKind}
        />
      </div>
    );
  }

  if (table && rowCount > 1) {
    return <CollapsedUrlTable table={table} count={rowCount} />;
  }

  return null;
}
