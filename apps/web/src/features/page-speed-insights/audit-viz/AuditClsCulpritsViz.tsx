"use client";

import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import { shortUrl } from "@/features/page-speed-insights/shared/format";
import { compareReportLabels } from "@/features/page-speed-insights/shared/reportLabels";
import type { NodeValue, TableItem } from "@/lib/schema";
import { getNumber, getUrlString, cn } from "@/lib/utils";
import { AuditBarChart } from "./AuditBarChart";
import { AuditKpiStrip } from "./AuditKpiStrip";
import { itemLabel, itemNumeric } from "./auditItemValues";

type CulpritExtra =
  | { kind: "node"; label: string; selector?: string; snippet?: string }
  | { kind: "url"; url: string }
  | { kind: "text"; text: string };

type CulpritCause = {
  cause: string;
  extra?: CulpritExtra;
};

type ShiftFinding = {
  id: string;
  reportLabel: string;
  score: number;
  elementLabel: string;
  selector?: string;
  snippet?: string;
  causes: CulpritCause[];
};

type ClusterSummary = {
  reportLabel: string;
  totalScore: number | null;
  shiftCount: number;
  causeCount: number;
  causeBreakdown: Array<{ cause: string; count: number }>;
};

function formatCls(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0";
  if (value < 0.001) return value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  return value.toFixed(3);
}

function isTotalRow(item: TableItem): boolean {
  const node = item.node;
  if (!node || typeof node !== "object") return false;
  const value = (node as NodeValue).value;
  const nodeLabel = (node as NodeValue).nodeLabel;
  if ((node as NodeValue).type === "text" && typeof value === "string") {
    return value.trim().toLowerCase() === "total";
  }
  return typeof nodeLabel === "string" && nodeLabel.trim().toLowerCase() === "total";
}

function tableItemsFromDetails(details: unknown): TableItem[] {
  if (!details || typeof details !== "object") return [];
  const d = details as { type?: string; items?: unknown[] };
  if (!Array.isArray(d.items)) return [];

  if (d.type === "list") {
    const nested: TableItem[] = [];
    for (const entry of d.items) {
      if (!entry || typeof entry !== "object") continue;
      const table = entry as { type?: string; items?: TableItem[] };
      if (table.type === "table" && Array.isArray(table.items)) {
        nested.push(...table.items);
      }
    }
    return nested;
  }

  return d.items as TableItem[];
}

function causeText(raw: unknown): string {
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (raw && typeof raw === "object") {
    const message = (raw as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();
    const value = (raw as { value?: unknown }).value;
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function extraFromSubItem(raw: unknown): CulpritExtra | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const value = raw as Record<string, unknown>;
  const type = typeof value.type === "string" ? value.type : "";

  if (type === "url" || "value" in value) {
    const url = getUrlString(value.value) || getUrlString(value.url);
    if (url) return { kind: "url", url };
  }

  if (type === "node" || type === "text") {
    const node = value as unknown as NodeValue;
    const label =
      (typeof node.nodeLabel === "string" && node.nodeLabel.trim()) ||
      (typeof node.selector === "string" && node.selector.trim()) ||
      (typeof node.snippet === "string" && node.snippet.trim()) ||
      (typeof node.value === "string" && node.value.trim()) ||
      "Element";
    return {
      kind: "node",
      label,
      selector: typeof node.selector === "string" ? node.selector : undefined,
      snippet: typeof node.snippet === "string" ? node.snippet : undefined,
    };
  }

  if (typeof value.value === "string" && value.value.trim()) {
    return { kind: "text", text: value.value.trim() };
  }

  return undefined;
}

function nodeMeta(item: TableItem): {
  label: string;
  selector?: string;
  snippet?: string;
} {
  const node = item.node;
  if (node && typeof node === "object") {
    const n = node as NodeValue;
    return {
      label: itemLabel(item, ["node"]),
      selector: typeof n.selector === "string" ? n.selector : undefined,
      snippet: typeof n.snippet === "string" ? n.snippet : undefined,
    };
  }
  return { label: itemLabel(item, ["node", "url"]) };
}

function extractCauses(item: TableItem): CulpritCause[] {
  const causes: CulpritCause[] = [];
  for (const sub of item.subItems?.items || []) {
    const cause = causeText(sub.cause);
    if (!cause) continue;
    causes.push({
      cause,
      extra: extraFromSubItem(sub.extra),
    });
  }
  return causes;
}

export function extractClsCulpritData(rows: DetailTableItem[]): {
  summaries: ClusterSummary[];
  shifts: ShiftFinding[];
  barPoints: Array<{ label: string; category: string; value: number }>;
} {
  const summaries: ClusterSummary[] = [];
  const shifts: ShiftFinding[] = [];
  const barPoints: Array<{ label: string; category: string; value: number }> = [];

  rows.forEach((row, rowIndex) => {
    const reportLabel = row._userLabel || "Report";
    const items = tableItemsFromDetails(row.auditResult?.details);
    let totalScore: number | null = null;
    const causeCounts = new Map<string, number>();
    let shiftCount = 0;

    items.forEach((item, itemIndex) => {
      const score = itemNumeric(item, ["score"]) ?? getNumber(item.score) ?? 0;

      if (isTotalRow(item)) {
        totalScore = score;
        return;
      }

      const meta = nodeMeta(item);
      if (meta.label === "Total") {
        totalScore = score;
        return;
      }

      const causes = extractCauses(item);
      shiftCount += 1;
      for (const c of causes) {
        causeCounts.set(c.cause, (causeCounts.get(c.cause) || 0) + 1);
      }

      if (score > 0) {
        barPoints.push({
          label: reportLabel,
          category: meta.label,
          value: score,
        });
      }

      shifts.push({
        id: `${rowIndex}-${itemIndex}-${meta.label}`,
        reportLabel,
        score,
        elementLabel: meta.label,
        selector: meta.selector,
        snippet: meta.snippet,
        causes,
      });
    });

    if (totalScore == null && shiftCount > 0) {
      totalScore = shifts
        .filter((s) => s.reportLabel === reportLabel)
        .reduce((sum, s) => sum + s.score, 0);
    }

    const savings = getNumber(
      (row.auditResult as { metricSavings?: { CLS?: unknown } } | undefined)?.metricSavings?.CLS,
    );

    if (shiftCount > 0 || totalScore != null || (savings != null && savings > 0)) {
      summaries.push({
        reportLabel,
        totalScore: totalScore ?? savings ?? null,
        shiftCount,
        causeCount: [...causeCounts.values()].reduce((a, b) => a + b, 0),
        causeBreakdown: [...causeCounts.entries()]
          .map(([cause, count]) => ({ cause, count }))
          .sort((a, b) => b.count - a.count || a.cause.localeCompare(b.cause)),
      });
    }
  });

  shifts.sort((a, b) => b.score - a.score || a.elementLabel.localeCompare(b.elementLabel));

  return { summaries, shifts, barPoints };
}

// App is dark via :root tokens (no `.dark` class) — skip `dark:` variants.
const causeTone: Record<string, string> = {
  "unsized image": "border-amber-400/50 bg-amber-500/20 text-amber-100",
  "web font": "border-violet-300/50 bg-violet-500/25 text-violet-100",
  "injected iframe": "border-sky-400/50 bg-sky-500/20 text-sky-100",
  animation: "border-rose-400/50 bg-rose-500/20 text-rose-100",
};

function causeBadgeClass(cause: string): string {
  const key = cause.toLowerCase();
  for (const [needle, cls] of Object.entries(causeTone)) {
    if (key.includes(needle)) return cls;
  }
  return "border-border bg-muted/50 text-muted-foreground";
}

function CulpritExtraView({ extra }: { extra: CulpritExtra }) {
  if (extra.kind === "url") {
    return (
      <a
        href={extra.url}
        target="_blank"
        rel="noreferrer"
        className="truncate text-xs text-primary hover:underline"
        title={extra.url}
      >
        {shortUrl(extra.url)}
      </a>
    );
  }
  if (extra.kind === "node") {
    return (
      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-xs" title={extra.label}>
          {extra.label}
        </p>
        {extra.selector ? (
          <p className="truncate font-mono text-[11px] text-muted-foreground" title={extra.selector}>
            {extra.selector}
          </p>
        ) : null}
        {extra.snippet ? (
          <p className="truncate font-mono text-[11px] text-sky-300" title={extra.snippet}>
            {extra.snippet}
          </p>
        ) : null}
      </div>
    );
  }
  return <p className="truncate text-xs text-muted-foreground">{extra.text}</p>;
}

function kpiMetricsFor(summary: ClusterSummary) {
  const metrics: Array<{ label: string; value: number; format: "cls" | "count" }> = [];
  if (summary.totalScore != null) {
    metrics.push({ label: "Cluster CLS", value: summary.totalScore, format: "cls" });
  }
  metrics.push({ label: "Shifts", value: summary.shiftCount, format: "count" });
  metrics.push({ label: "Root causes", value: summary.causeCount, format: "count" });
  return metrics;
}

function CauseMix({
  breakdown,
  reportLabel,
}: {
  breakdown: ClusterSummary["causeBreakdown"];
  reportLabel?: string;
}) {
  if (!breakdown.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">
        Root cause mix
        {reportLabel ? (
          <span className="ml-1 font-normal text-muted-foreground/80">· {reportLabel}</span>
        ) : null}
      </p>
      <div className="flex flex-wrap gap-2">
        {breakdown.map((entry) => (
          <span
            key={entry.cause}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
              causeBadgeClass(entry.cause),
            )}
          >
            {entry.cause}
            <span className="font-mono tabular-nums opacity-80">×{entry.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ShiftList({ shifts, showCount }: { shifts: ShiftFinding[]; showCount?: boolean }) {
  if (!shifts.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">
        Shift culprits
        {showCount ? (
          <span className="ml-1 font-normal text-muted-foreground/80">({shifts.length})</span>
        ) : null}
      </p>
      <ul className="space-y-2">
        {shifts.map((shift) => (
          <li key={shift.id} className="rounded-lg border bg-card/40 px-3 py-2.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium">{shift.elementLabel}</p>
                {shift.selector ? (
                  <p
                    className="truncate font-mono text-[11px] text-muted-foreground"
                    title={shift.selector}
                  >
                    {shift.selector}
                  </p>
                ) : null}
                {shift.snippet ? (
                  <p
                    className="truncate font-mono text-[11px] text-sky-300"
                    title={shift.snippet}
                  >
                    {shift.snippet}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
                {formatCls(shift.score)}
              </span>
            </div>

            {shift.causes.length ? (
              <ul className="mt-2 space-y-1.5 border-t pt-2">
                {shift.causes.map((cause, index) => (
                  <li
                    key={`${shift.id}-cause-${index}`}
                    className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2"
                  >
                    <span
                      className={cn(
                        "shrink-0 rounded border px-1.5 py-0.5 text-[11px] font-medium",
                        causeBadgeClass(cause.cause),
                      )}
                    >
                      {cause.cause}
                    </span>
                    {cause.extra ? <CulpritExtraView extra={cause.extra} /> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">
                No detected root cause for this shift
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReportSection({
  reportLabel,
  summary,
  shifts,
  showHeader,
}: {
  reportLabel: string;
  summary?: ClusterSummary;
  shifts: ShiftFinding[];
  showHeader: boolean;
}) {
  return (
    <section
      className={cn(
        "space-y-3",
        showHeader && "rounded-lg border border-border/80 bg-muted/10 p-3",
      )}
      aria-label={showHeader ? `${reportLabel} layout shift culprits` : undefined}
    >
      {showHeader ? (
        <h3 className="text-sm font-semibold tracking-wide text-foreground">{reportLabel}</h3>
      ) : null}
      {summary ? (
        <AuditKpiStrip groups={[{ reportLabel, metrics: kpiMetricsFor(summary) }]} />
      ) : null}
      {summary ? <CauseMix breakdown={summary.causeBreakdown} /> : null}
      <ShiftList shifts={shifts} showCount={!showHeader} />
    </section>
  );
}

export function AuditClsCulpritsViz({ rows }: { rows: DetailTableItem[] }) {
  const { summaries, shifts, barPoints } = extractClsCulpritData(rows);
  if (!summaries.length && !shifts.length) return null;

  const reportLabels = [
    ...new Set([...summaries, ...shifts].map((entry) => entry.reportLabel)),
  ].sort(compareReportLabels);
  const multiReport = reportLabels.length > 1;

  const summaryByLabel = new Map(summaries.map((summary) => [summary.reportLabel, summary]));
  const shiftsByLabel = new Map<string, ShiftFinding[]>();
  for (const shift of shifts) {
    const list = shiftsByLabel.get(shift.reportLabel) ?? [];
    list.push(shift);
    shiftsByLabel.set(shift.reportLabel, list);
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      {barPoints.length ? (
        <AuditBarChart
          points={barPoints}
          unit="score"
          title={
            multiReport
              ? "Layout shift score by element (compare reports)"
              : "Layout shift score by element"
          }
        />
      ) : null}

      {multiReport ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {reportLabels.map((reportLabel) => (
            <ReportSection
              key={reportLabel}
              reportLabel={reportLabel}
              summary={summaryByLabel.get(reportLabel)}
              shifts={shiftsByLabel.get(reportLabel) ?? []}
              showHeader
            />
          ))}
        </div>
      ) : (
        <ReportSection
          reportLabel={reportLabels[0] || "Report"}
          summary={summaries[0]}
          shifts={shifts}
          showHeader={false}
        />
      )}
    </div>
  );
}
