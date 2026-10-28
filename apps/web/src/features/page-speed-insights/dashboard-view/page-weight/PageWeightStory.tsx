"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  comparePageWeight,
  formatByteDelta,
  pageWeightReportsFromItems,
  percentDelta,
  type PageWeightReport,
  type UrlComparisonRow,
  type WeightDeltaStatus,
} from "@/features/page-speed-insights/dashboard-view/page-weight/pageWeightModel";
import { useDashboardSearchState } from "@/features/page-speed-insights/dashboard-view/useDashboardSearch";
import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";
import { CompareReportPicker } from "@/features/page-speed-insights/shared/CompareReportPicker";
import { resolveCompareSelection } from "@/features/page-speed-insights/shared/compareSelection";
import { formatBytes, shortUrl } from "@/features/page-speed-insights/shared/format";
import { getNetworkBarColor } from "@/features/page-speed-insights/shared/networkResourceColors";
import { cn } from "@/lib/cn";

const URL_LIMIT = 25;

const STATUS_LABEL: Record<WeightDeltaStatus, string> = {
  added: "New",
  removed: "Gone",
  grew: "Grew",
  shrank: "Shrank",
  same: "Same",
};

function deltaClass(delta: number) {
  if (delta > 0) return "text-rose-600 dark:text-rose-400";
  if (delta < 0) return "text-emerald-600 dark:text-emerald-400";
  return "text-muted-foreground";
}

function Delta({ from, to }: { from: number; to: number }) {
  const delta = to - from;
  const percent = percentDelta(from, to);
  return (
    <span className={cn("font-mono tabular-nums", deltaClass(delta))}>
      {formatByteDelta(delta, formatBytes)}
      {percent && delta !== 0 ? (
        <span className="ml-1 text-xs opacity-80">({percent})</span>
      ) : null}
    </span>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </p>
  );
}

function CompositionBars({ reports }: { reports: PageWeightReport[] }) {
  const max = Math.max(...reports.map((report) => report.totalBytes), 1);
  const legend = [
    ...new Set(reports.flatMap((report) => report.types.map((type) => type.resourceType))),
  ];

  return (
    <div className="space-y-3">
      <SectionLabel>Composition</SectionLabel>
      <div className="space-y-3">
        {reports.map((report) => (
          <div key={report.label} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium">{report.label}</span>
              <span className="font-mono tabular-nums text-muted-foreground">
                {formatBytes(report.totalBytes)} · {report.requestCount.toLocaleString()} requests
              </span>
            </div>
            <div
              className="flex h-8 overflow-hidden rounded-md bg-muted"
              style={{ width: `${(report.totalBytes / max) * 100}%` }}
              role="img"
              aria-label={`${report.label} weight by type`}
            >
              {report.types.map((type) => (
                <div
                  key={type.resourceType}
                  className={cn(
                    "h-full border-r border-background/60 last:border-r-0",
                    getNetworkBarColor(type.resourceType),
                  )}
                  style={{ flexGrow: type.transferSize, flexBasis: 0 }}
                  title={`${type.resourceType} · ${formatBytes(type.transferSize)} · ${type.requestCount} requests`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {legend.map((resourceType) => (
          <li key={resourceType} className="flex items-center gap-1.5">
            <span
              className={cn("size-2.5 rounded-sm", getNetworkBarColor(resourceType))}
              aria-hidden
            />
            {resourceType}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SingleTypeTable({ report }: { report: PageWeightReport }) {
  return (
    <Table aria-label="Weight by type">
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Requests</TableHead>
          <TableHead className="text-right">Transfer</TableHead>
          <TableHead className="text-right">Share</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {report.types.map((type) => (
          <TableRow key={type.resourceType}>
            <TableCell>{type.resourceType}</TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {type.requestCount.toLocaleString()}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {formatBytes(type.transferSize)}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
              {report.totalBytes > 0
                ? `${Math.round((type.transferSize / report.totalBytes) * 100)}%`
                : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function CompareTypeTable({
  comparison,
}: {
  comparison: ReturnType<typeof comparePageWeight>;
}) {
  const { a, b } = comparison;
  return (
    <Table aria-label="Weight by type">
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">{a.label}</TableHead>
          <TableHead className="text-right">{b.label}</TableHead>
          <TableHead className="text-right">Change</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {comparison.types.map((row) => (
          <TableRow key={row.resourceType}>
            <TableCell>{row.resourceType}</TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {row.a ? formatBytes(row.a.transferSize) : "—"}
              <span className="ml-1 text-xs text-muted-foreground">
                {row.a ? `· ${row.a.requestCount}` : ""}
              </span>
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {row.b ? formatBytes(row.b.transferSize) : "—"}
              <span className="ml-1 text-xs text-muted-foreground">
                {row.b ? `· ${row.b.requestCount}` : ""}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <Delta from={row.a?.transferSize ?? 0} to={row.b?.transferSize ?? 0} />
            </TableCell>
          </TableRow>
        ))}
        <TableRow className="font-medium">
          <TableCell>Total</TableCell>
          <TableCell className="text-right font-mono tabular-nums">
            {formatBytes(a.totalBytes)}
          </TableCell>
          <TableCell className="text-right font-mono tabular-nums">
            {formatBytes(b.totalBytes)}
          </TableCell>
          <TableCell className="text-right">
            <Delta from={a.totalBytes} to={b.totalBytes} />
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

function UrlCell({ url }: { url: string }) {
  return (
    <span className="block max-w-[28rem] truncate font-mono text-xs" title={url}>
      {shortUrl(url)}
    </span>
  );
}

function ShowAllButton({
  total,
  showAll,
  onToggle,
}: {
  total: number;
  showAll: boolean;
  onToggle: () => void;
}) {
  if (total <= URL_LIMIT) return null;
  return (
    <Button type="button" variant="outline" size="sm" onClick={onToggle}>
      {showAll ? `Show top ${URL_LIMIT}` : `Show all ${total.toLocaleString()}`}
    </Button>
  );
}

function SingleUrlTable({ report }: { report: PageWeightReport }) {
  const [showAll, setShowAll] = useState(false);
  const rows = showAll ? report.urls : report.urls.slice(0, URL_LIMIT);
  if (!report.urls.length) return null;

  return (
    <div className="space-y-3">
      <SectionLabel>Heaviest URLs</SectionLabel>
      <Table aria-label="Heaviest URLs">
        <TableHeader>
          <TableRow>
            <TableHead>URL</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Transfer</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell>
                <UrlCell url={row.url} />
              </TableCell>
              <TableCell>{row.resourceType}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatBytes(row.transferSize)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ShowAllButton
        total={report.urls.length}
        showAll={showAll}
        onToggle={() => setShowAll((value) => !value)}
      />
    </div>
  );
}

const URL_FILTERS = ["changed", "added", "removed", "all"] as const;
type UrlFilter = (typeof URL_FILTERS)[number];

const URL_FILTER_LABEL: Record<UrlFilter, string> = {
  changed: "Changed",
  added: "New",
  removed: "Gone",
  all: "All",
};

function matchesFilter(row: UrlComparisonRow, filter: UrlFilter) {
  if (filter === "all") return true;
  if (filter === "changed") return row.status !== "same";
  return row.status === filter;
}

function CompareUrlTable({
  comparison,
}: {
  comparison: ReturnType<typeof comparePageWeight>;
}) {
  const [filter, setFilter] = useState<UrlFilter>("changed");
  const [showAll, setShowAll] = useState(false);
  const filtered = comparison.urls.filter((row) => matchesFilter(row, filter));
  const rows = showAll ? filtered : filtered.slice(0, URL_LIMIT);
  const counts = Object.fromEntries(
    URL_FILTERS.map((key) => [key, comparison.urls.filter((row) => matchesFilter(row, key)).length]),
  ) as Record<UrlFilter, number>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionLabel>URL changes</SectionLabel>
        <div role="group" aria-label="URL filter" className="flex flex-wrap gap-2">
          {URL_FILTERS.map((key) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={filter === key ? "default" : "outline"}
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {URL_FILTER_LABEL[key]} ({counts[key]})
            </Button>
          ))}
        </div>
      </div>
      {rows.length ? (
        <Table aria-label="URL changes">
          <TableHeader>
            <TableRow>
              <TableHead>URL</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">{comparison.a.label}</TableHead>
              <TableHead className="text-right">{comparison.b.label}</TableHead>
              <TableHead className="text-right">Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
                        row.status === "added" || row.status === "grew"
                          ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                          : row.status === "same"
                            ? "bg-muted text-muted-foreground"
                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                      )}
                    >
                      {STATUS_LABEL[row.status]}
                    </span>
                    <UrlCell url={row.url} />
                  </div>
                </TableCell>
                <TableCell>{row.resourceType}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {row.a != null ? formatBytes(row.a) : "—"}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {row.b != null ? formatBytes(row.b) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <span className={cn("font-mono tabular-nums", deltaClass(row.delta))}>
                    {formatByteDelta(row.delta, formatBytes)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground">No URLs match this filter.</p>
      )}
      <ShowAllButton
        total={filtered.length}
        showAll={showAll}
        onToggle={() => setShowAll((value) => !value)}
      />
    </div>
  );
}

function Headline({ reports }: { reports: PageWeightReport[] }) {
  const [a, b] = reports;
  if (!a) return null;
  if (!b) {
    return (
      <header className="max-w-3xl">
        <SectionLabel>Page weight</SectionLabel>
        <p className="mt-2 font-mono text-4xl font-semibold tabular-nums tracking-tight">
          {formatBytes(a.totalBytes)}
        </p>
        <p className="mt-2 text-lg leading-snug">
          across {a.requestCount.toLocaleString()} requests
          {a.thirdPartyBytes ? ` · ${formatBytes(a.thirdPartyBytes)} third-party` : ""}
        </p>
      </header>
    );
  }

  const delta = b.totalBytes - a.totalBytes;
  const requestDelta = b.requestCount - a.requestCount;
  return (
    <header className="max-w-3xl">
      <SectionLabel>Page weight change</SectionLabel>
      <p
        className={cn(
          "mt-2 font-mono text-4xl font-semibold tabular-nums tracking-tight",
          deltaClass(delta),
        )}
        data-testid="page-weight-delta"
      >
        {formatByteDelta(delta, formatBytes)}
        {percentDelta(a.totalBytes, b.totalBytes) && delta !== 0 ? (
          <span className="ml-2 text-xl">({percentDelta(a.totalBytes, b.totalBytes)})</span>
        ) : null}
      </p>
      <p className="mt-2 text-lg leading-snug">
        {a.label} {formatBytes(a.totalBytes)} → {b.label} {formatBytes(b.totalBytes)} ·{" "}
        {requestDelta === 0
          ? "same request count"
          : `${requestDelta > 0 ? "+" : "−"}${Math.abs(requestDelta).toLocaleString()} ${
              Math.abs(requestDelta) === 1 ? "request" : "requests"
            }`}
      </p>
    </header>
  );
}

export function PageWeightStory() {
  const items = usePageSpeedItems();
  const { report: urlReports } = useDashboardSearchState();
  const reports = useMemo(() => pageWeightReportsFromItems(items), [items]);
  const labels = reports.map((report) => report.label);
  const selectedLabels = resolveCompareSelection(urlReports, labels);
  const selected = selectedLabels
    .map((label) => reports.find((report) => report.label === label))
    .filter((report): report is PageWeightReport => report != null);
  const [a, b] = selected;
  const comparison = a && b ? comparePageWeight(a, b) : null;

  if (!a) {
    return (
      <p className="text-sm text-muted-foreground">
        This report has no resource sizes to measure page weight.
      </p>
    );
  }

  return (
    <section aria-label="Page weight" className="overflow-hidden rounded-xl border bg-card">
      <div className="space-y-6 p-4 sm:p-6">
        <CompareReportPicker labels={labels} selected={selectedLabels} />
        <Headline reports={selected} />
        <CompositionBars reports={selected} />
        {comparison ? <CompareTypeTable comparison={comparison} /> : <SingleTypeTable report={a} />}
        {comparison ? <CompareUrlTable comparison={comparison} /> : <SingleUrlTable report={a} />}
      </div>
    </section>
  );
}
