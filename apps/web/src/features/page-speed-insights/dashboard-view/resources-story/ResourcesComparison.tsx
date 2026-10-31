"use client";

import type { ReactNode } from "react";
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
  patchDashboardSearch,
  type ResourceStageId,
} from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import { PayloadFlow } from "@/features/page-speed-insights/dashboard-view/resources-story/PayloadFlow";
import {
  formatMetric,
  formatMetricDelta,
  type ResourcesComparison,
  type SuspectTag,
} from "@/features/page-speed-insights/dashboard-view/resources-story/resourcesComparisonModel";
import type { ResourcesInvestigation } from "@/features/page-speed-insights/dashboard-view/resources-story/resourcesInvestigationModel";
import { SuspectList } from "@/features/page-speed-insights/dashboard-view/resources-story/SuspectList";
import { TransferWeightMap } from "@/features/page-speed-insights/dashboard-view/resources-story/TransferWeightMap";
import { cn } from "@/lib/cn";

function deltaClass(delta: number | null) {
  if (delta == null || delta === 0) return "text-muted-foreground";
  return delta > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400";
}

function MetricsTable({
  comparison,
  stage,
  onSelectStage,
}: {
  comparison: ResourcesComparison;
  stage: ResourceStageId;
  onSelectStage: (id: ResourceStageId) => void;
}) {
  return (
    <Table aria-label="Resources comparison">
      <TableHeader>
        <TableRow>
          <TableHead>Measure</TableHead>
          <TableHead className="text-right">{comparison.a.label}</TableHead>
          <TableHead className="text-right">{comparison.b.label}</TableHead>
          <TableHead className="text-right">Change</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {comparison.metrics.map((row) => (
          <TableRow
            key={row.id}
            data-state={row.stage === stage ? "selected" : undefined}
            className="cursor-pointer"
            onClick={() => onSelectStage(row.stage)}
          >
            <TableCell>{row.label}</TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {formatMetric(row.a, row.unit)}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {formatMetric(row.b, row.unit)}
            </TableCell>
            <TableCell className={cn("text-right font-mono tabular-nums", deltaClass(row.delta))}>
              {formatMetricDelta(row.delta, row.unit)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ReportPane({
  report,
  stage,
  suspectUrl,
  tagFor,
  onSelectStage,
  onSelectSuspect,
}: {
  report: ResourcesInvestigation;
  stage: ResourceStageId;
  suspectUrl: string | null;
  tagFor: (url: string) => SuspectTag;
  onSelectStage: (id: ResourceStageId) => void;
  onSelectSuspect: (url: string) => void;
}) {
  const emphasizeUnused = report.lead.kind === "wasted-download" || stage === "unused";
  return (
    <article
      aria-label={report.label}
      className="min-w-0 space-y-5 rounded-lg border bg-background/40 p-4"
    >
      <header>
        <p className="truncate text-sm font-semibold">{report.label}</p>
        <p className="mt-2 font-mono text-3xl font-semibold tabular-nums tracking-tight">
          {report.lead.magnitude}
        </p>
        <p className="mt-1 text-sm leading-snug text-muted-foreground">{report.lead.sentence}</p>
      </header>
      <PayloadFlow stages={report.stages} selectedId={stage} onSelect={onSelectStage} />
      <TransferWeightMap
        nodes={report.nodes}
        emphasizeUnused={emphasizeUnused}
        selectedUrl={suspectUrl}
        onSelect={onSelectSuspect}
      />
      <SuspectList
        suspects={report.suspects}
        selectedUrl={suspectUrl}
        onSelect={onSelectSuspect}
        tagFor={tagFor}
        ariaLabel={`Investigate next in ${report.label}`}
      />
    </article>
  );
}

export function ResourcesComparisonBrief({
  comparison,
  picker,
  stage,
  suspectUrl,
  onSelectStage,
  onSelectSuspect,
}: {
  comparison: ResourcesComparison;
  picker: ReactNode;
  stage: ResourceStageId;
  suspectUrl: string | null;
  onSelectStage: (id: ResourceStageId) => void;
  onSelectSuspect: (url: string) => void;
}) {
  const { a, b } = comparison;
  return (
    <section
      aria-label="Resources comparison"
      className="overflow-hidden rounded-xl border bg-card"
    >
      <div className="space-y-6 p-4 sm:p-6">
        {picker}
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Comparing
            </p>
            <p
              className="mt-1 truncate text-lg font-semibold"
              data-testid="resources-compare-title"
            >
              {a.label} vs {b.label}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => patchDashboardSearch({ tab: "weight", open: null }, "push")}
          >
            URL-level changes in Page Weight
          </Button>
        </header>
        <MetricsTable comparison={comparison} stage={stage} onSelectStage={onSelectStage} />
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <ReportPane
            report={a}
            stage={stage}
            suspectUrl={suspectUrl}
            tagFor={comparison.tagInA}
            onSelectStage={onSelectStage}
            onSelectSuspect={onSelectSuspect}
          />
          <ReportPane
            report={b}
            stage={stage}
            suspectUrl={suspectUrl}
            tagFor={comparison.tagInB}
            onSelectStage={onSelectStage}
            onSelectSuspect={onSelectSuspect}
          />
        </div>
      </div>
    </section>
  );
}
