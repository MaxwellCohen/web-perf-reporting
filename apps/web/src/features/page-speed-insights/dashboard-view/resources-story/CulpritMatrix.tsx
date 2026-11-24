"use client";

import { ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { patchDashboardSearch } from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import { formFactorOf } from "@/features/page-speed-insights/dashboard-view/investigate/metricScoring";
import {
  buildCulpritMatrix,
  culpritPrompt,
  type CulpritRow,
} from "@/features/page-speed-insights/dashboard-view/resources-story/culpritMatrixModel";
import { formatBytes, formatMs } from "@/features/page-speed-insights/shared/format";
import type { PageSpeedInsights } from "@/lib/schema";
import { cn } from "@/lib/utils";

type SortKey = "lcpMs" | "fcpMs" | "tbtMs" | "cls" | "bytes";
type PartyFilter = "all" | "first" | "third";

const COLUMNS: { key: SortKey; label: string; hint: string }[] = [
  {
    key: "lcpMs",
    label: "LCP",
    hint: "Load delay and duration of the LCP resource, plus render-blocking time",
  },
  { key: "fcpMs", label: "FCP", hint: "Render-blocking time before first paint" },
  { key: "tbtMs", label: "TBT", hint: "Main-thread blocking time attributed to the script" },
  { key: "cls", label: "CLS", hint: "Layout shift score attributed to the file" },
  { key: "bytes", label: "Bytes", hint: "Transfer size" },
];

const FILTERS: { id: PartyFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "first", label: "First-party" },
  { id: "third", label: "Third-party" },
];

function format(key: SortKey, value: number): string {
  if (!value) return "–";
  if (key === "cls") return value.toFixed(3);
  return key === "bytes" ? formatBytes(value) : formatMs(value);
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0 rounded-lg border bg-card p-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium">{value}</p>
      {sub ? <p className="mt-0.5 break-words text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function Findings({ row, page }: { row: CulpritRow; page: { url: string; formFactor: string } }) {
  return (
    <div className="space-y-3">
      {row.findings.length ? (
        <ul className="grid gap-2 md:grid-cols-2">
          {row.findings.map((finding, i) => (
            <li key={`${finding.auditId}:${i}`} className="space-y-1 rounded-lg border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-medium">{finding.title}</h4>
                <Badge variant="secondary" className="shrink-0">
                  {finding.saving}
                </Badge>
              </div>
              {finding.detail ? <p className="text-xs">{finding.detail}</p> : null}
              <p className="text-xs text-muted-foreground">{finding.fix}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No audit flagged this file directly.</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <CopyButton text={culpritPrompt(row, page)} size="sm">
          <span className="ml-2">Copy fix prompt for {row.name}</span>
        </CopyButton>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => patchDashboardSearch({ tab: "timeline", query: row.url }, "push")}
        >
          Show in waterfall
        </Button>
      </div>
    </div>
  );
}

export function CulpritMatrix({
  item,
  compare,
}: {
  item: PageSpeedInsights;
  compare?: { label: string; item: PageSpeedInsights };
}) {
  const matrix = useMemo(() => buildCulpritMatrix(item), [item]);
  const other = useMemo(
    () => (compare ? new Map(buildCulpritMatrix(compare.item).rows.map((r) => [r.url, r])) : null),
    [compare],
  );
  const [party, setParty] = useState<PartyFilter>("all");
  const [sort, setSort] = useState<SortKey>("lcpMs");
  const [open, setOpen] = useState<Set<string>>(new Set());

  const rows = useMemo(
    () =>
      matrix.rows
        .filter((row) => party === "all" || row.party === party)
        .sort((a, b) => b[sort] - a[sort] || b.tbtMs - a.tbtMs),
    [matrix.rows, party, sort],
  );
  const max = (key: SortKey) => Math.max(0, ...rows.map((row) => row[key]));
  const maxes = Object.fromEntries(COLUMNS.map((c) => [c.key, max(c.key)])) as Record<
    SortKey,
    number
  >;
  const { summary } = matrix;
  const page = {
    url: item.lighthouseResult?.finalUrl ?? "",
    formFactor: formFactorOf(item),
  };
  const tp = summary.thirdParty;

  function toggle(url: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(url)) next.add(url);
      return next;
    });
  }

  function delta(row: CulpritRow, key: "bytes" | "tbtMs") {
    const before = other?.get(row.url);
    if (!before || !compare) return null;
    const diff = row[key] - before[key];
    if (!diff) return null;
    return (
      <span className="block text-[11px] text-muted-foreground">
        Δ vs {compare.label}: {diff > 0 ? "+" : "−"}
        {key === "bytes" ? formatBytes(Math.abs(diff)) : formatMs(Math.abs(diff))}
      </span>
    );
  }

  return (
    <section aria-label="Culprit matrix" className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
      <header className="max-w-3xl space-y-1">
        <h2 className="text-lg font-semibold">Which files make the page slow?</h2>
        <p className="text-sm text-muted-foreground">
          Each file with the time, layout shift, and bytes it costs, plus the audits that flagged
          it.
        </p>
      </header>

      <div className="grid gap-2 sm:grid-cols-3">
        <Tile
          label="Top culprit"
          value={summary.top ? summary.top.name : "None found"}
          sub={summary.top?.cost}
        />
        <Tile
          label="Third parties"
          value={`${tp.entities} ${tp.entities === 1 ? "party" : "parties"} · ${formatBytes(tp.bytes)}`}
          sub={`TBT ${formatMs(tp.tbtMs)} · CLS ${tp.cls.toFixed(3)}`}
        />
        <Tile
          label="Real users (p75)"
          value={`LCP ${summary.field.lcp ?? "–"} · INP ${summary.field.inp ?? "–"}`}
          sub={
            summary.field.passed === null
              ? undefined
              : `Core Web Vitals ${summary.field.passed ? "passed" : "failed"}`
          }
        />
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by party">
        {FILTERS.map((filter) => (
          <Button
            key={filter.id}
            type="button"
            size="sm"
            variant={party === filter.id ? "default" : "outline"}
            aria-pressed={party === filter.id}
            onClick={() => setParty(filter.id)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {rows.length ? (
        <Table className="min-w-[44rem] table-auto" wrapperClassName="rounded-lg border">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-card">File</TableHead>
              {COLUMNS.map((column) => (
                <TableHead
                  key={column.key}
                  aria-sort={sort === column.key ? "descending" : "none"}
                  title={
                    column.key === "tbtMs"
                      ? `${column.hint} (${
                          summary.tbtSource === "bootup-time"
                            ? "from bootup-time scripting"
                            : "from long tasks"
                        })`
                      : column.hint
                  }
                  className="text-right"
                >
                  <button
                    type="button"
                    className="font-medium hover:text-foreground"
                    onClick={() => setSort(column.key)}
                  >
                    {column.label}
                    {sort === column.key ? " ↓" : ""}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const expanded = open.has(row.url);
              return [
                <TableRow key={row.url}>
                  <TableCell className="sticky left-0 z-10 max-w-[16rem] bg-card">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-label={`${expanded ? "Hide" : "Show"} findings for ${row.name}`}
                      className="flex w-full items-start gap-1 text-left"
                      onClick={() => toggle(row.url)}
                    >
                      <ChevronRight
                        className={cn(
                          "mt-0.5 size-4 shrink-0 transition-transform",
                          expanded && "rotate-90",
                        )}
                      />
                      <span className="min-w-0">
                        <span className="block break-all font-mono text-xs">{row.name}</span>
                        <span className="mt-1 flex items-center gap-1">
                          <Badge variant={row.party === "first" ? "secondary" : "outline"}>
                            {row.party === "first" ? "1st" : "3rd"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{row.type}</span>
                        </span>
                      </span>
                    </button>
                  </TableCell>
                  {COLUMNS.map((column) => {
                    const value = row[column.key];
                    return (
                      <TableCell
                        key={column.key}
                        className="text-right font-mono text-xs tabular-nums"
                        style={
                          value && maxes[column.key]
                            ? {
                                backgroundColor: `hsl(var(--chart-3) / ${(0.08 + 0.5 * (value / maxes[column.key])).toFixed(2)})`,
                              }
                            : undefined
                        }
                      >
                        {format(column.key, value)}
                        {column.key === "bytes" || column.key === "tbtMs"
                          ? delta(row, column.key)
                          : null}
                      </TableCell>
                    );
                  })}
                </TableRow>,
                expanded ? (
                  <TableRow key={`${row.url}:findings`}>
                    <TableCell colSpan={COLUMNS.length + 1}>
                      <Findings row={row} page={page} />
                    </TableCell>
                  </TableRow>
                ) : null,
              ];
            })}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground">No files match this filter.</p>
      )}
      <p className="text-xs text-muted-foreground">
        Costs overlap, so columns don&apos;t sum to the metric.
      </p>
    </section>
  );
}
