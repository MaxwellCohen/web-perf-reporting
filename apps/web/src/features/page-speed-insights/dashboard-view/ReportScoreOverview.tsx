"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";
import { cn } from "@/lib/utils";
import {
  formatScore,
  scoreToneColor,
  summarizeReport,
  type CategoryScore,
  type MetricScore,
  type ReportScoreSummary,
} from "@/features/page-speed-insights/dashboard-view/reportScoreSummary";
import {
  getCompareRuns,
  itemsForRun,
  pairByFormFactor,
} from "@/features/page-speed-insights/shared/compareRuns";

const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ScoreRing({ score, label }: { score: number | null; label: string }) {
  const color = scoreToneColor(score);
  const dashOffset = RING_CIRCUMFERENCE * (1 - (score ?? 0));

  return (
    <div
      className="relative size-14 shrink-0"
      role="img"
      aria-label={`${label}: ${formatScore(score)}`}
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="10"
          stroke="hsl(var(--muted))"
        />
        <circle
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-lg font-bold tabular-nums"
        style={{ color }}
      >
        {formatScore(score)}
      </span>
    </div>
  );
}

function CategoryScoreRow({ category }: { category: CategoryScore }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="flex min-w-0 items-center gap-1.5">
        <span
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: scoreToneColor(category.score) }}
          aria-hidden
        />
        <span className="truncate text-muted-foreground">{category.title}</span>
      </span>
      <span className="font-mono font-semibold tabular-nums">{formatScore(category.score)}</span>
    </div>
  );
}

function MetricTile({ metric }: { metric: MetricScore }) {
  const scoreOutOf100 = metric.score != null ? formatScore(metric.score) : null;
  const scoreLabel = scoreOutOf100 != null ? `${scoreOutOf100}/100` : "–";
  // Weighted contribution toward Performance (score 0–1 × auditRef weight).
  const contributionLabel =
    metric.score != null && metric.weight != null
      ? `+${Math.round(metric.score * metric.weight)}/${metric.weight}`
      : null;
  const scoreColor = scoreToneColor(metric.score);

  return (
    <div
      className="flex min-w-0 flex-col gap-0.5 rounded-md border border-l-[3px] bg-muted/30 px-2 py-1"
      style={{ borderLeftColor: scoreColor }}
      title={metric.title}
      aria-label={[
        metric.title,
        metric.displayValue,
        scoreOutOf100 != null ? `score ${scoreLabel}` : null,
        contributionLabel ? `contribution ${contributionLabel}` : null,
      ]
        .filter(Boolean)
        .join(", ")}
    >
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-[10px] font-medium leading-none text-muted-foreground">
          {metric.acronym}
        </span>
        <span
          className="font-mono text-[10px] font-semibold tabular-nums leading-none"
          style={{ color: scoreColor }}
        >
          {scoreLabel}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-1">
        <span className="min-w-0 truncate font-mono text-sm font-semibold tabular-nums leading-tight">
          {metric.displayValue ?? "–"}
        </span>
        {contributionLabel ? (
          <span className="shrink-0 text-[10px] font-medium tabular-nums leading-none text-muted-foreground">
            {contributionLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ReportScoreCard({ summary }: { summary: ReportScoreSummary }) {
  return (
    <Card className="min-w-0" data-testid="report-score-card">
      <CardHeader className="space-y-0 px-3 py-2">
        <CardTitle className="text-sm">{summary.label}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5 px-3 pb-3 pt-0">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center gap-0.5">
            <ScoreRing score={summary.performance?.score ?? null} label="Performance" />
            <span className="text-[10px] font-medium text-muted-foreground">Performance</span>
          </div>
          {summary.otherCategories.length > 0 ? (
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {summary.otherCategories.map((category) => (
                <CategoryScoreRow key={category.id} category={category} />
              ))}
            </div>
          ) : null}
        </div>
        {summary.metrics.length > 0 ? (
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-5">
            {summary.metrics.map((metric) => (
              <MetricTile key={metric.id} metric={metric} />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CompareScoreOverview({
  items,
  runs,
}: {
  items: ReturnType<typeof usePageSpeedItems>;
  runs: [string, string];
}) {
  const pairs = pairByFormFactor(items, runs);

  return (
    <section
      aria-label="Score overview"
      className="flex flex-col gap-2"
      data-testid="score-compare"
    >
      {pairs.map((pair) => (
        <div key={pair.formFactor} className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {pair.a ? <ReportScoreCard summary={summarizeReport(pair.a)} /> : <div />}
          {pair.b ? <ReportScoreCard summary={summarizeReport(pair.b)} /> : <div />}
        </div>
      ))}
      {pairs.length === 0
        ? runs.map((run) => (
            <div key={run} className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {itemsForRun(items, run).map((item) => (
                <ReportScoreCard key={item.label} summary={summarizeReport(item)} />
              ))}
            </div>
          ))
        : null}
    </section>
  );
}

export function ReportScoreOverview() {
  const items = usePageSpeedItems();
  const compare = getCompareRuns(items);

  if (!items.length) {
    return null;
  }

  if (compare.mode === "compare") {
    return <CompareScoreOverview items={items} runs={compare.runs} />;
  }

  return (
    <section
      aria-label="Score overview"
      className={cn("grid grid-cols-1 gap-2", items.length > 1 && "lg:grid-cols-2")}
    >
      {items.map((item) => (
        <ReportScoreCard key={item.label} summary={summarizeReport(item)} />
      ))}
    </section>
  );
}
