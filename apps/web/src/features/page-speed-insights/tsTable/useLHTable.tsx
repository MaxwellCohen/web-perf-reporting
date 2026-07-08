import type { StockColumnDef, StockRow } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { PageSpeedInsights } from "@/lib/schema";
import { flexRender, useTable, type CreateRowModels, type StockFeatures } from "@tanstack/react-table";
import { Fragment, useMemo } from "react";
import clsx from "clsx";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AuditDetailsSummary } from "@/features/page-speed-insights/lh-categories/AuditDetailsSummary";
import { RenderMetricSavings } from "@/features/page-speed-insights/lh-categories/RenderMetricSavings";
import { RenderDetails } from "@/features/page-speed-insights/lh-categories/RenderDetails";
import { RenderJSONDetails } from "@/features/page-speed-insights/RenderJSONDetails";
import { TableDataItem } from "@/features/page-speed-insights/tsTable/TableDataItem";
import { LH_AUDIT_TABLE_COLUMNS } from "@/features/page-speed-insights/tsTable/lhAuditTableColumns";
import { stockFeatures } from "@/features/page-speed-insights/tanstack-table-v9/features";
import { lhTableRowModels } from "@/features/page-speed-insights/tsTable/lhTableRowModels";

export function useLHTable(items: { item: PageSpeedInsights; label: string }[]) {
  const tableDataArr = useMemo(
    () =>
      (
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
      ).filter((v) => v.auditRef.group !== "metrics"),
    [items],
  );
  return useTable({
    features: stockFeatures,
    rowModels: lhTableRowModels as unknown as CreateRowModels<StockFeatures, TableDataItem>,
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

export function CategoryRow({ row }: { row: StockRow<TableDataItem> }) {
  return (
    <AccordionItem value={row.id} key={row.id}>
      <AccordionTrigger className="flex flex-wrap" disabled={!row.getCanExpand()}>
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
      </AccordionTrigger>
      <AccordionContent>
        {row.subRows.map((subRow) => (
          <AuditSummaryRow row={subRow} key={subRow.id} />
        ))}
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
      className={clsx("items-center gap-4 border border-x-4 border-gray-400 py-2")}
    >
      <AccordionTrigger disabled={!row.getCanExpand()}>
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
        <RenderDetails items={row.subRows.map((r) => r.original)} />
      </AccordionContent>
    </AccordionItem>
  );
}
