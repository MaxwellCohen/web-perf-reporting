"use client";

import { Button } from "@/components/ui/button";
import {
  allOpenKeys,
  metricSectionId,
  metricSectionKey,
  type OverviewModel,
} from "@/features/page-speed-insights/dashboard-view/overview/overviewModel";
import {
  useFocusReport,
  useOverviewOpen,
} from "@/features/page-speed-insights/dashboard-view/overview/overviewOpen";
import { scoreTextClass } from "@/features/page-speed-insights/dashboard-view/overview/overviewTone";
import {
  formatScore,
  summarizeReport,
} from "@/features/page-speed-insights/dashboard-view/reportScoreSummary";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import { cn } from "@/lib/utils";

/** Report switch, the focused report's metric values as jump links, and expand / collapse all. */
export function OverviewSummaryBar({
  items,
  model,
}: {
  items: InsightsContextItem[];
  model: OverviewModel;
}) {
  const open = useOverviewOpen();
  const { focus, setFocus } = useFocusReport(items);
  if (!focus) return null;

  const summaries = items.map(summarizeReport);
  const focused = summaries.find((summary) => summary.label === focus.label);
  const withSection = new Set(
    model.metrics.filter((metric) => metric.hasSection).map((metric) => metric.metricId),
  );

  return (
    <section
      aria-label="Report summary"
      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border bg-card p-3"
    >
      {summaries.length > 1 ? (
        <div role="group" aria-label="Report" className="flex gap-0.5 rounded-lg bg-muted p-1">
          {summaries.map((summary) => {
            const selected = summary.label === focus.label;
            return (
              <button
                key={summary.label}
                type="button"
                aria-pressed={selected}
                onClick={() => setFocus(summary.label)}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold",
                  selected
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span>{summary.label}</span>
                <span
                  className={cn(
                    "font-mono tabular-nums",
                    scoreTextClass(summary.performance?.score),
                  )}
                >
                  {formatScore(summary.performance?.score ?? null)}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <ul className="grid min-w-0 flex-[999_1_17rem] grid-cols-[repeat(auto-fit,minmax(5.5rem,1fr))] gap-1">
        {focused?.metrics.map((metric) => {
          const content = (
            <>
              <span className="block text-xs text-muted-foreground">{metric.acronym}</span>
              <span
                className={cn(
                  "block font-mono text-sm font-semibold whitespace-nowrap tabular-nums sm:text-base",
                  scoreTextClass(metric.score),
                )}
              >
                {metric.displayValue?.replace(/ /g, " ") ?? "–"}
              </span>
            </>
          );
          return (
            <li key={metric.id} className="min-w-0">
              {open && withSection.has(metric.id) ? (
                <button
                  type="button"
                  aria-label={`${metric.title}: ${metric.displayValue ?? "no value"}. Jump to causes.`}
                  onClick={() =>
                    open.reveal([metricSectionKey(metric.id)], metricSectionId(metric.id))
                  }
                  className="min-h-11 w-full rounded-md px-1.5 text-left hover:bg-muted"
                >
                  {content}
                </button>
              ) : (
                <div className="px-1.5">{content}</div>
              )}
            </li>
          );
        })}
      </ul>

      {open ? (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-11"
            onClick={() => open.setAll(allOpenKeys(model))}
          >
            Expand all
          </Button>
          <Button variant="outline" className="h-11" onClick={() => open.setAll([])}>
            Collapse all
          </Button>
        </div>
      ) : null}
    </section>
  );
}
