"use client";

import { Button } from "@/components/ui/button";
import {
  patchDashboardSearch,
  type DashboardSearchPatch,
} from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import {
  orderCompareLabels,
  toggleCompareSelection,
} from "@/features/page-speed-insights/shared/compareSelection";

/** Report chips that write up to two `report=` labels. Hidden with only one report. */
export function CompareReportPicker({
  labels,
  selected,
  resetPatch,
}: {
  labels: string[];
  selected: string[];
  /** Extra search state to reset alongside the new selection. */
  resetPatch?: DashboardSearchPatch;
}) {
  if (labels.length < 2) return null;

  return (
    <div className="space-y-1">
      <div role="group" aria-label="Reports to compare" className="flex flex-wrap gap-2">
        {orderCompareLabels(labels).map((label) => {
          const isSelected = selected.includes(label);
          return (
            <Button
              key={label}
              type="button"
              size="sm"
              variant={isSelected ? "default" : "outline"}
              aria-pressed={isSelected}
              onClick={() =>
                patchDashboardSearch({
                  ...resetPatch,
                  report: toggleCompareSelection(selected, label),
                })
              }
            >
              {label}
            </Button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Pick two reports to compare. The first one picked is the baseline.
      </p>
    </div>
  );
}
