"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import {
  buildImpactOpportunities,
  fixPromptFor,
  IMPACT_METRICS,
  planPrompt,
  projectScore,
  type ImpactMetric,
  type Opportunity,
} from "@/features/page-speed-insights/dashboard-view/recommendations-story/impactModel";
import { scoreToneColor } from "@/features/page-speed-insights/dashboard-view/reportScoreSummary";
import type { PageSpeedInsights } from "@/lib/schema";
import { cn } from "@/lib/utils";

type MetricFilter = "All" | ImpactMetric;

function ScoreTile({ label, score }: { label: string; score: number | null }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p
        className="font-mono text-3xl font-semibold tabular-nums"
        style={{ color: scoreToneColor(score === null ? null : score / 100) }}
      >
        {score ?? "–"}
      </p>
    </div>
  );
}

function formatGain(points: number): string {
  return `+${points.toFixed(1)} pts est.`;
}

function Detail({
  item,
  opportunity,
  inPlan,
  onToggle,
}: {
  item: PageSpeedInsights;
  opportunity: Opportunity;
  inPlan: boolean;
  onToggle: () => void;
}) {
  return (
    <article aria-label="Selected fix" className="space-y-3 rounded-lg border bg-card p-3 sm:p-4">
      <div className="flex flex-wrap gap-1">
        {opportunity.metrics.map((metric) => (
          <Badge key={metric} variant="outline">
            {metric}
          </Badge>
        ))}
      </div>
      <header className="space-y-1">
        <h3 className="text-base font-semibold">{opportunity.title}</h3>
        <p className="font-mono text-sm tabular-nums text-muted-foreground">
          {formatGain(opportunity.pointsGained)} · {opportunity.savingDisplay}{" "}
          {opportunity.savingWhat}
        </p>
      </header>
      {opportunity.why ? <p className="text-sm">{opportunity.why}</p> : null}
      {opportunity.files.length ? (
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Files involved
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-1 pr-3 font-medium">File</th>
                  <th className="py-1 pr-3 font-medium">Now</th>
                  <th className="py-1 font-medium">Saves</th>
                </tr>
              </thead>
              <tbody>
                {opportunity.files.map((file, index) => (
                  <tr key={`${file.url}:${index}`} className="border-t">
                    <td className="max-w-[16rem] truncate py-1 pr-3 font-mono" title={file.url}>
                      {file.url}
                    </td>
                    <td className="py-1 pr-3 tabular-nums">{file.now}</td>
                    <td className="py-1 tabular-nums">{file.saves}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      <div className="rounded-md bg-muted/50 p-3 text-sm">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          How
        </p>
        {opportunity.fix}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={inPlan ? "secondary" : "default"}
          onClick={onToggle}
        >
          {inPlan ? "✓ In plan — remove" : "Add to plan"}
        </Button>
        <CopyButton text={fixPromptFor(item, opportunity)} size="sm">
          Copy fix prompt
        </CopyButton>
      </div>
    </article>
  );
}

export function ImpactRanking({ item }: { item: PageSpeedInsights }) {
  const opportunities = useMemo(() => buildImpactOpportunities(item), [item]);
  const [filter, setFilter] = useState<MetricFilter>("All");
  const [selectedId, setSelectedId] = useState<string | undefined>(opportunities[0]?.id);
  const [plan, setPlan] = useState<string[]>([]);

  const { now, projected } = useMemo(
    () => projectScore(item, plan, opportunities),
    [item, plan, opportunities],
  );

  if (opportunities.length === 0) {
    return (
      <section aria-label="What to fix first" className="rounded-xl border bg-card p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">
          No fixes with a measurable impact were found in this report.
        </p>
      </section>
    );
  }

  const ranked = opportunities.map((opportunity, index) => ({ opportunity, rank: index + 1 }));
  const visible = ranked.filter(
    ({ opportunity }) => filter === "All" || opportunity.metrics.includes(filter),
  );
  const maxPoints = Math.max(...opportunities.map((o) => o.pointsGained), 0.1);
  const selected = opportunities.find((o) => o.id === selectedId) ?? opportunities[0];
  const inPlan = (id: string) => plan.includes(id);
  const toggle = (id: string) =>
    setPlan((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  const planItems = opportunities.filter((o) => inPlan(o.id));

  return (
    <section
      aria-label="What to fix first"
      className="space-y-4 rounded-xl border bg-card p-4 sm:p-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl">
          <h2 className="text-lg font-semibold">What to fix first</h2>
          <p className="text-sm text-muted-foreground">
            Ranked by estimated Performance points gained. Add fixes to a plan to see the projected
            score.
          </p>
        </div>
        <div className="flex items-center gap-2" aria-label="Projected score">
          <ScoreTile label="Now" score={now} />
          <span aria-hidden className="text-muted-foreground">
            →
          </span>
          <ScoreTile label="With your plan (est.)" score={projected} />
        </div>
      </header>
      <div role="group" aria-label="Filter by metric" className="flex flex-wrap gap-2">
        {(["All", ...IMPACT_METRICS] as const).map((metric) => (
          <Button
            key={metric}
            type="button"
            size="sm"
            variant={filter === metric ? "default" : "outline"}
            aria-pressed={filter === metric}
            onClick={() => setFilter(metric)}
          >
            {metric}
          </Button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ol aria-label="Ranked fixes" className="space-y-2">
          {visible.map(({ opportunity, rank }) => {
            const active = selected.id === opportunity.id;
            return (
              <li key={opportunity.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedId(opportunity.id)}
                  className={cn(
                    "w-full space-y-1.5 rounded-lg border px-3 py-2 text-left transition",
                    active
                      ? "border-foreground/50 bg-muted/70"
                      : "border-border bg-background/40 hover:bg-muted/40",
                  )}
                >
                  <span className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="flex min-w-0 gap-2">
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {String(rank).padStart(2, "0")}
                      </span>
                      <span className="truncate font-medium">{opportunity.title}</span>
                    </span>
                    <span className="shrink-0 font-mono text-xs tabular-nums">
                      {inPlan(opportunity.id) ? "✓ " : ""}
                      {formatGain(opportunity.pointsGained)}
                    </span>
                  </span>
                  <span
                    className="block h-1.5 w-full overflow-hidden rounded-full bg-muted"
                    aria-hidden
                  >
                    <span
                      className="block h-full rounded-full bg-foreground/70"
                      style={{
                        width: `${Math.round((opportunity.pointsGained / maxPoints) * 100)}%`,
                      }}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <Detail
          item={item}
          opportunity={selected}
          inPlan={inPlan(selected.id)}
          onToggle={() => toggle(selected.id)}
        />
      </div>
      <div className="space-y-2 border-t pt-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Your plan
        </p>
        {planItems.length ? (
          <div className="flex flex-wrap gap-1.5">
            {planItems.map((o) => (
              <Badge key={o.id} variant="secondary">
                {o.title}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing added yet.</p>
        )}
        <p className="text-xs text-muted-foreground">
          Estimates overlap, so gains are not exactly additive.
        </p>
        {planItems.length ? (
          <CopyButton text={planPrompt(item, planItems)} size="sm">
            Copy plan as prompt
          </CopyButton>
        ) : null}
      </div>
    </section>
  );
}
