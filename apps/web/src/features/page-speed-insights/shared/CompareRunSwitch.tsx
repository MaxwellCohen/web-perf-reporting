"use client";

import { Button } from "@/components/ui/button";
import {
  getCompareRuns,
  parseCompareLabel,
  switchCompareRunLabel,
} from "@/features/page-speed-insights/shared/compareRuns";

type CompareRunSwitchProps = {
  labels: string[];
  currentLabel: string;
  onSelectLabel: (label: string) => void;
  className?: string;
};

/** Compact run chips: keep form factor, jump to the other run's matching report. */
export function CompareRunSwitch({
  labels,
  currentLabel,
  onSelectLabel,
  className,
}: CompareRunSwitchProps) {
  const compare = getCompareRuns(labels.map((label) => ({ label })));
  if (compare.mode !== "compare") return null;

  const currentRun = parseCompareLabel(currentLabel).run;

  return (
    <div
      className={className}
      role="group"
      aria-label="Compare run"
      data-testid="compare-run-switch"
    >
      <div className="flex flex-wrap gap-2">
        {compare.runs.map((run) => {
          const selected = currentRun === run;
          return (
            <Button
              key={run}
              type="button"
              size="sm"
              variant={selected ? "default" : "outline"}
              aria-pressed={selected}
              onClick={() => {
                const next = switchCompareRunLabel(currentLabel, run, labels);
                if (next) onSelectLabel(next);
              }}
            >
              {run}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
