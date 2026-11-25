"use client";

import {
  causeKey,
  metricSectionKey,
  rankTopFixes,
  type OverviewModel,
} from "@/features/page-speed-insights/dashboard-view/overview/overviewModel";
import { useOverviewOpen } from "@/features/page-speed-insights/dashboard-view/overview/overviewOpen";

/** The causes with the largest estimated savings for the focused report, as jump links. */
export function FixFirst({ model, label }: { model: OverviewModel; label: string }) {
  const open = useOverviewOpen();
  const fixes = rankTopFixes(model, label);
  if (!fixes.length || !open) return null;

  return (
    <section aria-labelledby="fix-first-title" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="fix-first-title" className="text-lg font-bold">
          Fix these first
        </h2>
        <p className="text-sm text-muted-foreground">Largest estimated savings on {label}</p>
      </div>
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-2">
        {fixes.map((fix) => {
          const home = model.homeOf.get(fix.auditId);
          return (
            <li key={fix.auditId} className="min-w-0">
              <button
                type="button"
                onClick={() =>
                  open.reveal(
                    [...(home ? [metricSectionKey(home)] : []), causeKey(fix.auditId)],
                    causeKey(fix.auditId),
                  )
                }
                className="flex min-h-16 w-full items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left hover:bg-muted"
              >
                <span className="shrink-0 font-mono text-lg font-semibold tabular-nums">
                  −{Math.round(fix.savingsMs)} ms
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{fix.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    Estimated {fix.acronym} saving
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
