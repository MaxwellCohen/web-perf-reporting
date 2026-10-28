import type {
  StockColumnDef,
  StockRow,
} from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { PageSpeedInsights } from "@/lib/schema";
import { flexRender, useTable } from "@tanstack/react-table";
import { Fragment } from "react";
import clsx from "clsx";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AuditDetailsSummary } from "@/features/page-speed-insights/lh-categories/AuditDetailsSummary";
import { RenderMetricSavings } from "@/features/page-speed-insights/lh-categories/RenderMetricSavings";
import { RenderDetails } from "@/features/page-speed-insights/lh-categories/RenderDetails";
import { RenderJSONDetails } from "@/features/page-speed-insights/RenderJSONDetails";
import {
  formatCategorySummary,
  partitionByStatus,
  type StatusSection,
} from "@/features/page-speed-insights/lh-categories/auditStatus";
import { useDashboardSearchState } from "@/features/page-speed-insights/dashboard-view/useDashboardSearch";
import { TableDataItem } from "@/features/page-speed-insights/tsTable/TableDataItem";
import { LH_AUDIT_TABLE_COLUMNS } from "@/features/page-speed-insights/tsTable/lhAuditTableColumns";
import { lhTableFeatures } from "@/features/page-speed-insights/tanstack-table-v9/features";

export function useLHTable(items: { item: PageSpeedInsights; label: string }[]) {
  const tableDataArr = (
    items
      .map(({ item, label }) => {
        return Object.values(item.lighthouseResult?.categories || {}).map((category) => {
          if (!category?.auditRefs?.length) {
            return [] as TableDataItem[];
          }
          const { auditRefs = [], ..._category } = category;
          return auditRefs.map((ar) => {
            if (!ar.id) return [] as TableDataItem[];
            return {
              _category,
              _userLabel: label,
              auditRef: ar,
              auditResult: item.lighthouseResult?.audits?.[ar.id],
            };
          });
        });
      })
      .flat(2) as TableDataItem[]
  ).filter((v) => v.auditRef.group !== "metrics");
  return useTable({
    features: lhTableFeatures,
    data: tableDataArr,
    columns: LH_AUDIT_TABLE_COLUMNS as StockColumnDef<TableDataItem>[],
    manualPagination: true,
    manualExpanding: true,
    enableColumnFilters: true,
    enableColumnPinning: true,
    initialState: {
      grouping: ["category_title", "id"],
    },
  });
}

const SECTION_HEADING_STYLES: Record<string, string> = {
  fail: "text-red-800 dark:text-red-300",
  average: "text-amber-800 dark:text-amber-300",
  pass: "text-emerald-800 dark:text-emerald-300",
};

function auditResultsOf(auditRow: StockRow<TableDataItem>) {
  return auditRow.subRows.map((sr) => sr.original.auditResult);
}

/**
 * Audits are grouped into Lighthouse-style status sections using each audit's worst
 * status across reports. Audits in the "hidden" group stay in their status section
 * (rather than a separate bucket) so a failing hidden audit is never buried.
 */
function StatusSections({
  sections,
  forceOpen,
  expandAll,
}: {
  sections: StatusSection<StockRow<TableDataItem>>[];
  forceOpen: boolean;
  /** Open every section and every audit row. Toggling remounts so it resets manual open/close state. */
  expandAll: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {sections.map((section) => (
        <details
          key={`${section.status}_${forceOpen}_${expandAll}`}
          open={section.defaultOpen || forceOpen || expandAll}
          className="group/section"
          data-testid={`audit-section-${section.status}`}
        >
          <summary
            className={clsx(
              "flex cursor-pointer items-center gap-2 py-1 text-sm font-bold",
              SECTION_HEADING_STYLES[section.status],
            )}
          >
            <span>{section.title}</span>
            <span className="rounded-full bg-muted px-2 text-xs font-semibold text-muted-foreground">
              {section.items.length}
            </span>
          </summary>
          <Accordion
            key={String(expandAll)}
            type="multiple"
            defaultValue={expandAll ? section.items.map((subRow) => subRow.id) : []}
            className="w-full"
          >
            {section.items.map((subRow) => (
              <AuditSummaryRow row={subRow} key={subRow.id} />
            ))}
          </Accordion>
        </details>
      ))}
    </div>
  );
}

export function CategoryRow({
  row,
  expandAll = false,
}: {
  row: StockRow<TableDataItem>;
  expandAll?: boolean;
}) {
  const { audit: auditFilter } = useDashboardSearchState();
  const sections = partitionByStatus(row.subRows, auditResultsOf);
  const summary = formatCategorySummary(sections);
  return (
    <AccordionItem value={row.id} key={row.id}>
      <AccordionTrigger className="items-start sm:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {row
            .getAllCells()
            .filter((cell) => ["category_title", "category_score"].includes(cell.column.id))
            .map((cell) => {
              return (
                <Fragment key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Fragment>
              );
            })}
          {summary ? (
            <div className="w-full text-xs font-normal text-muted-foreground sm:w-auto">
              {summary}
            </div>
          ) : null}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <StatusSections
          sections={sections}
          forceOpen={Boolean(auditFilter)}
          expandAll={expandAll}
        />
      </AccordionContent>
    </AccordionItem>
  );
}

export function AuditSummaryRow({ row }: { row: StockRow<TableDataItem> }) {
  const auditData = row.subRows.map((sr) => sr.original.auditResult || {});
  const labels = row.subRows.map((sr) => sr.original._userLabel || "");
  return (
    <AccordionItem
      value={row.id}
      className={clsx("items-center gap-4 border border-x-4 border-border py-2")}
    >
      <AccordionTrigger>
        <AuditDetailsSummary
          auditData={auditData}
          labels={labels}
          acronym={row.subRows[0]?.original.auditRef.acronym}
        />
      </AccordionTrigger>
      <AccordionContent>
        <RenderJSONDetails
          className="text-right"
          data={auditData[0]}
          data2={auditData[1]}
          title={`All Data for ${auditData[0]?.id}`}
        />
        <RenderMetricSavings auditData={auditData} labels={labels} />
        <Accordion type="multiple" className="w-full">
          <RenderDetails items={row.subRows.map((r) => r.original)} />
        </Accordion>
      </AccordionContent>
    </AccordionItem>
  );
}
