"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import {
  buildDiagnosis,
  worstPart,
  type Cause,
  type Diagnosis,
  type MetricDiagnosis,
  type Part,
  type PartStatus,
} from "@/features/page-speed-insights/dashboard-view/investigate/diagnosisModel";
import { TriageView } from "@/features/page-speed-insights/dashboard-view/investigate/TriageView";
import { buildFixPrompt } from "@/features/page-speed-insights/dashboard-view/investigate/fixPrompt";
import { patchDashboardSearch } from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import { scoreToneColor } from "@/features/page-speed-insights/dashboard-view/reportScoreSummary";
import { useDashboardSearchState } from "@/features/page-speed-insights/dashboard-view/useDashboardSearch";
import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";
import { CompareReportPicker } from "@/features/page-speed-insights/shared/CompareReportPicker";
import { resolveCompareSelection } from "@/features/page-speed-insights/shared/compareSelection";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<PartStatus, { label: string; color: string }> = {
  good: { label: "Good", color: scoreToneColor(1) },
  ni: { label: "Needs work", color: scoreToneColor(0.7) },
  poor: { label: "Poor", color: scoreToneColor(0) },
};

function formatPoints(points: number): string {
  return `−${points.toFixed(1)} pts`;
}

function ColumnHeading({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </p>
  );
}

function pickButtonClass(active: boolean) {
  return cn(
    "flex h-auto w-full flex-col items-stretch gap-1 whitespace-normal rounded-lg border p-3 text-left font-normal",
    active ? "border-foreground bg-accent" : "bg-card hover:bg-accent/50",
  );
}

function MetricColumn({
  metrics,
  compare,
  selected,
  onSelect,
}: {
  metrics: MetricDiagnosis[];
  compare?: { label: string; diagnosis: Diagnosis };
  selected: string;
  onSelect: (acronym: string) => void;
}) {
  return (
    <div className="space-y-2">
      <ColumnHeading>What costs the most</ColumnHeading>
      {metrics.map((metric) => {
        const other = compare?.diagnosis.metrics.find((m) => m.acronym === metric.acronym);
        return (
          <Button
            key={metric.acronym}
            type="button"
            variant="ghost"
            aria-pressed={selected === metric.acronym}
            className={pickButtonClass(selected === metric.acronym)}
            onClick={() => onSelect(metric.acronym)}
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-medium">{metric.title}</span>
              <span className="font-mono text-sm tabular-nums">
                {formatPoints(metric.pointsLost)}
              </span>
            </span>
            <span className="text-xs text-muted-foreground">
              Lab {metric.labDisplay}
              {metric.field ? ` · Field p75 ${metric.field.label} ${metric.field.display}` : ""}
            </span>
            {other ? (
              <span className="text-xs text-muted-foreground">
                vs {compare?.label}: {other.labDisplay} · {formatPoints(other.pointsLost)}
              </span>
            ) : null}
            <span className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${Math.round((1 - metric.score) * 100)}%`,
                  background: scoreToneColor(metric.score),
                }}
              />
            </span>
          </Button>
        );
      })}
    </div>
  );
}

function PartColumn({
  metric,
  selected,
  onSelect,
}: {
  metric: MetricDiagnosis;
  selected: string | undefined;
  onSelect: (id: string) => void;
}) {
  const total = metric.parts.reduce((sum, part) => sum + part.value, 0);
  return (
    <div className="space-y-3">
      <ColumnHeading>{`Where ${metric.acronym} goes`}</ColumnHeading>
      <p className="text-3xl font-semibold tabular-nums">{metric.labDisplay}</p>
      {metric.parts.length ? (
        <>
          <div className="flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden>
            {metric.parts.map((part) => (
              <span
                key={part.id}
                className="h-full border-r border-background last:border-r-0"
                style={{
                  width: `${(part.value / total) * 100}%`,
                  background: STATUS_STYLE[part.status].color,
                }}
              />
            ))}
          </div>
          <div className="space-y-2">
            {metric.parts.map((part) => (
              <Button
                key={part.id}
                type="button"
                variant="ghost"
                aria-pressed={selected === part.id}
                className={cn(pickButtonClass(selected === part.id), "flex-row items-center gap-2")}
                onClick={() => onSelect(part.id)}
              >
                <span className="min-w-0 flex-1 truncate">{part.label}</span>
                <span className="font-mono text-sm tabular-nums">{part.display}</span>
                <Badge variant="outline">{STATUS_STYLE[part.status].label}</Badge>
              </Button>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          This report has no breakdown for {metric.acronym}.
        </p>
      )}
    </div>
  );
}

function CauseCard({
  cause,
  diagnosis,
  metric,
}: {
  cause: Cause;
  diagnosis: Diagnosis;
  metric: MetricDiagnosis;
}) {
  const prompt = cause.auditId
    ? buildFixPrompt({
        url: diagnosis.url,
        formFactor: diagnosis.formFactor,
        metric: metric.acronym,
        title: cause.title,
        evidence: cause.evidence,
        fix: cause.fix,
        auditId: cause.auditId,
      })
    : "";
  return (
    <article className="space-y-3 rounded-lg border bg-card p-3">
      <header className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium">{cause.title}</h3>
        <Badge variant="secondary" className="shrink-0">
          {cause.savingDisplay}
        </Badge>
      </header>
      {cause.evidence.length ? (
        <dl className="space-y-1 text-xs">
          {cause.evidence.map(({ k, v }) => (
            <div key={`${k}:${v}`} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
              <dt className="shrink-0 text-muted-foreground sm:w-28">{k}</dt>
              <dd className="min-w-0 break-all font-mono">{v}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <p className="rounded-md bg-muted p-2 text-xs">
        <span className="font-medium">Fix: </span>
        {cause.fix}
      </p>
      {cause.auditId ? (
        <div className="flex flex-wrap gap-2">
          <CopyButton text={prompt} size="sm">
            <span className="ml-2">Copy fix prompt</span>
          </CopyButton>
          {cause.timelineLink ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => patchDashboardSearch({ tab: "timeline" }, "push")}
            >
              Show in timeline
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => patchDashboardSearch({ tab: "audits", audit: cause.auditId }, "push")}
          >
            Raw audit
          </Button>
        </div>
      ) : null}
    </article>
  );
}

export function DiagnoseTabPanel() {
  const items = usePageSpeedItems();
  const { report: urlReports } = useDashboardSearchState();
  const labels = items.map((entry) => entry.label);
  const [first, second] = resolveCompareSelection(urlReports, labels);
  const primary = items.find((entry) => entry.label === first);
  const secondary = items.find((entry) => entry.label === second);

  const diagnosis = useMemo(
    () => (primary?.item.lighthouseResult?.audits ? buildDiagnosis(primary.item) : null),
    [primary],
  );
  const secondDiagnosis = useMemo(
    () => (secondary?.item.lighthouseResult?.audits ? buildDiagnosis(secondary.item) : null),
    [secondary],
  );

  const [metricChoice, setMetricChoice] = useState<string>();
  const [partChoice, setPartChoice] = useState<string>();
  const [view, setView] = useState<"metric" | "cause">("metric");

  if (!diagnosis?.metrics.length) {
    return (
      <p className="text-sm text-muted-foreground">
        This report has no Lighthouse results to diagnose.
      </p>
    );
  }

  const metric = diagnosis.metrics.find((m) => m.acronym === metricChoice) ?? diagnosis.metrics[0];
  const part: Part | undefined = metric.parts.find((p) => p.id === partChoice) ?? worstPart(metric);

  return (
    <section aria-label="Diagnose" className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
      <CompareReportPicker labels={labels} selected={[first, second].filter(Boolean)} />
      <div role="group" aria-label="Diagnose view" className="flex gap-2">
        {(["metric", "cause"] as const).map((v) => (
          <Button
            key={v}
            type="button"
            size="sm"
            variant="outline"
            aria-pressed={view === v}
            className={cn(view === v && "border-foreground bg-accent")}
            onClick={() => setView(v)}
          >
            {v === "metric" ? "By metric" : "By cause"}
          </Button>
        ))}
      </div>
      {view === "cause" && primary ? (
        <TriageView primary={primary} secondary={secondary} />
      ) : (
        <>
          <nav aria-label="Drill-down" className="text-sm text-muted-foreground">
            Why is it slow? › <span className="text-foreground">{metric.acronym}</span>
            {part ? (
              <>
                {" › "}
                <span className="text-foreground">{part.label}</span>
                {` › ${part.causes.length} ${part.causes.length === 1 ? "cause" : "causes"}`}
              </>
            ) : null}
          </nav>
          <div className="grid gap-6 lg:grid-cols-3">
            <MetricColumn
              metrics={diagnosis.metrics}
              compare={
                secondDiagnosis && second
                  ? { label: second, diagnosis: secondDiagnosis }
                  : undefined
              }
              selected={metric.acronym}
              onSelect={(acronym) => {
                setMetricChoice(acronym);
                setPartChoice(undefined);
              }}
            />
            <PartColumn metric={metric} selected={part?.id} onSelect={setPartChoice} />
            <div className="space-y-2">
              <ColumnHeading>Why, with evidence</ColumnHeading>
              {part ? (
                part.causes.map((cause) => (
                  <CauseCard key={cause.id} cause={cause} diagnosis={diagnosis} metric={metric} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Pick a part to see its causes.</p>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
