"use client";
import { useLayoutEffect, useState } from "react";
import {
  usePageSpeedItems,
  useRequiredPageSpeedInsightsStore,
} from "@/features/page-speed-insights/PageSpeedContext";
import { patchDashboardSearch } from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import { useDashboardSearchState } from "@/features/page-speed-insights/dashboard-view/useDashboardSearch";
import { CategoryRow, useLHTable } from "@/features/page-speed-insights/tsTable/useLHTable";
import { Button } from "@/components/ui/button";
import { StringFilterHeader } from "@/features/page-speed-insights/tanstack-table-v9/StringFilterHeader";
import { Accordion } from "@/components/ui/accordion";

export function LighthouseAuditsPanel() {
  const store = useRequiredPageSpeedInsightsStore();
  const items = usePageSpeedItems();
  const table = useLHTable(items);
  const { audit, groups } = useDashboardSearchState();
  const [expandAll, setExpandAll] = useState(false);
  const rows = table.getRowModel().rows;

  const toggleExpandAll = () => {
    const next = !expandAll;
    setExpandAll(next);
    patchDashboardSearch({ groups: next ? rows.map((row) => row.id) : null });
  };

  useLayoutEffect(() => {
    const column = table.getColumn("auditTitle");
    if (!column) return;
    const current = String(column.getFilterValue() ?? "");
    if (current === audit) return;
    column.setFilterValue(audit);
  }, [audit, table]);

  return (
    <>
      {items.length > 0 ? (
        <div className="flex flex-col gap-3 px-3 py-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <StringFilterHeader
              column={table.getColumn("auditTitle")}
              name="Audit"
              onValueChange={(value) => patchDashboardSearch({ audit: value })}
            />
          </div>
          <div className="flex shrink-0 gap-2 sm:mb-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              aria-pressed={expandAll}
              onClick={toggleExpandAll}
            >
              {expandAll ? "Collapse all" : "Expand all"}
            </Button>
            <Button
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => {
                table.resetColumnFilters();
                store.trigger.resetUserLabelFilter();
                patchDashboardSearch({ labels: null, audit: null });
              }}
            >
              Reset filters
            </Button>
          </div>
        </div>
      ) : null}
      <Accordion
        type="multiple"
        value={groups}
        onValueChange={(next) => patchDashboardSearch({ groups: next.length ? next : null })}
      >
        {rows.map((row) => (
          <CategoryRow key={row.id} row={row} expandAll={expandAll} />
        ))}
      </Accordion>
    </>
  );
}
