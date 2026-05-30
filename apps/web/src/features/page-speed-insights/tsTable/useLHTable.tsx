import { PageSpeedInsights } from "@/lib/schema";
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getGroupedRowModel,
  Row,
  useReactTable,
} from "@tanstack/react-table";
import { Fragment, useMemo, useState } from "react";
import clsx from "clsx";
import { AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AccordionContent } from "@radix-ui/react-accordion";
import { AuditDetailsSummary } from "@/features/page-speed-insights/lh-categories/AuditDetailsSummary";
import { RenderMetricSavings } from "@/features/page-speed-insights/lh-categories/RenderMetricSavings";
import { RenderDetails } from "@/features/page-speed-insights/lh-categories/RenderDetails";
import { RenderJSONDetails } from "@/features/page-speed-insights/RenderJSONDetails";
import { TableDataItem } from "@/features/page-speed-insights/tsTable/TableDataItem";
import { LH_AUDIT_TABLE_COLUMNS } from "@/features/page-speed-insights/tsTable/lhAuditTableColumns";
import {
  arrIncludesSomeFilter,
  booleanFilterFn,
} from "@/features/page-speed-insights/shared/filterFns";

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
  const [grouping, setGrouping] = useState(["category_title", "id"]);
  return useReactTable({
    data: tableDataArr,
    columns: LH_AUDIT_TABLE_COLUMNS,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGroupingChange: setGrouping,
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: true,
    manualExpanding: true,
    enableColumnFilters: true,
    enableColumnPinning: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- arrIncludesSome is not in EntitiesTable FilterFns augmentation
    filterFns: {
      booleanFilterFn,
      arrIncludesSome: arrIncludesSomeFilter,
    } as any,
    state: {
      grouping,
    },
  });
}

export function CategoryRow({ row }: { row: Row<TableDataItem> }) {
  "use no memo";
  return (
    <AccordionItem value={row.id} key={row.id}>
      <AccordionTrigger
        className="flex flex-wrap"
        disabled={!row.getCanExpand()}
        onClick={row.getToggleExpandedHandler()}
      >
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
        {row.getIsExpanded()
          ? row.subRows.map((subRow) => <AuditSummaryRow row={subRow} key={subRow.id} />)
          : null}
      </AccordionContent>
    </AccordionItem>
  );
}

export function AuditSummaryRow({ row }: { row: Row<TableDataItem> }) {
  const auditData = row.subRows.map((sr) => sr.original.auditResult || {});
  const labels = row.subRows.map((sr) => sr.original._userLabel || "");
  return (
    <AccordionItem
      value={row.id}
      className={clsx("items-center gap-4 border border-x-4 border-gray-400 py-2")}
    >
      <AccordionTrigger disabled={!row.getCanExpand()} onClick={row.getToggleExpandedHandler()}>
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
