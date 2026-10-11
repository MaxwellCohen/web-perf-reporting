"use client";
import {
  usePageSpeedItems,
  useRequiredPageSpeedInsightsStore,
} from "@/features/page-speed-insights/PageSpeedContext";
import { CategoryRow, useLHTable } from "@/features/page-speed-insights/tsTable/useLHTable";
import { Button } from "@/components/ui/button";
import { StringFilterHeader } from "@/features/page-speed-insights/tanstack-table-v9/StringFilterHeader";
import { Accordion } from "@/components/ui/accordion";

export function LighthouseAuditsPanel() {
  const store = useRequiredPageSpeedInsightsStore();
  const items = usePageSpeedItems();
  const table = useLHTable(items);

  return (
    <>
      {items.length > 0 ? (
        <div className="flex flex-col gap-3 px-3 py-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <StringFilterHeader column={table.getColumn("auditTitle")} name="Audit" />
          </div>
          <div className="flex shrink-0 gap-2 sm:mb-2">
            <Button
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => {
                table.resetColumnFilters();
                store.trigger.resetUserLabelFilter();
              }}
            >
              Reset filters
            </Button>
          </div>
        </div>
      ) : null}
      <Accordion type="multiple">
        {table.getRowModel().rows.map((row) => (
          <CategoryRow key={row.id} row={row} />
        ))}
      </Accordion>
    </>
  );
}
