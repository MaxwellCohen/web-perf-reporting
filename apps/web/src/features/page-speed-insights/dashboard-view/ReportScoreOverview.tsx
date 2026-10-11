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

const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ScoreRing({ score, label }: { score: number | null; label: string }) {
  const color = scoreToneColor(score);
  const dashOffset = RING_CIRCUMFERENCE * (1 - (score ?? 0));

  return (
    <div
      className="relative size-24 shrink-0"
      role="img"
      aria-label={`${label}: ${formatScore(score)}`}
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="8"
          stroke="hsl(var(--muted))"
        />
        <circle
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-2xl font-bold tabular-nums"
        style={{ color }}
      >
        {formatScore(score)}
      </span>
    </div>
  );
}

function CategoryScoreRow({ category }: { category: CategoryScore }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <span
          className="size-2 shrink-0 rounded-full"
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
  return (
    <div
      className="flex min-w-0 flex-col gap-1 rounded-lg border border-l-4 bg-muted/30 px-3 py-2"
      style={{ borderLeftColor: scoreToneColor(metric.score) }}
      title={metric.title}
    >
      <span className="text-xs font-medium text-muted-foreground">{metric.acronym}</span>
      <span className="truncate font-mono text-base font-semibold tabular-nums">
        {metric.displayValue ?? "–"}
      </span>
    </div>
  );
}

function ReportScoreCard({ summary }: { summary: ReportScoreSummary }) {
  return (
    <Card className="min-w-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{summary.label}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-5">
          <div className="flex flex-col items-center gap-1">
            <ScoreRing score={summary.performance?.score ?? null} label="Performance" />
            <span className="text-xs font-medium text-muted-foreground">Performance</span>
          </div>
          {summary.otherCategories.length > 0 ? (
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {summary.otherCategories.map((category) => (
                <CategoryScoreRow key={category.id} category={category} />
              ))}
            </div>
          ) : null}
        </div>
        {summary.metrics.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {summary.metrics.map((metric) => (
              <MetricTile key={metric.id} metric={metric} />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ReportScoreOverview() {
  const items = usePageSpeedItems();

  if (!items.length) {
    return null;
  }

  return (
    <section
      aria-label="Score overview"
      className={cn("grid grid-cols-1 gap-4", items.length > 1 && "lg:grid-cols-2")}
    >
      {items.map((item) => (
        <ReportScoreCard key={item.label} summary={summarizeReport(item)} />
      ))}
    </section>
  );
}
