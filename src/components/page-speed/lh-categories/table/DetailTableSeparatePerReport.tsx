'use client';
import { TableItem, OpportunityItem, AuditDetailTable } from '@/lib/schema';
import { createColumnHelper, useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getFacetedRowModel, getFacetedUniqueValues, getFacetedMinMaxValues, SortingState, ColumnFiltersState, ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { toTitleCase } from '@/components/page-speed/toTitleCase';
import { DetailTableItem, canSort, canGroup, isNumberColumn } from '@/components/page-speed/lh-categories/table/RenderTable';
import { RenderTableValue } from '@/components/page-speed/lh-categories/table/RenderTableValue';
import { NetworkWaterfallCell } from '@/components/page-speed/lh-categories/table/NetworkWaterfallCell';
import { ItemValue } from '@/lib/schema';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Table } from '@/components/ui/table';
import { DataTableHeader } from '@/components/page-speed/lh-categories/table/DataTableHeader';
import { DataTableBody } from '@/components/page-speed/lh-categories/table/DataTableBody';
import { booleanFilterFn } from '@/components/page-speed/lh-categories/table/DataTableNoGrouping';
import {
  getNetworkRequestsTimeRange,
  isNetworkRequestsAudit,
  NETWORK_REQUESTS_COLUMN_ORDER,
  NetworkRequestTimeRange,
  sortHeadingsByKeyOrder,
  WATERFALL_REPLACED_NETWORK_REQUEST_KEYS,
} from '@/components/page-speed/shared/networkRequestsTable';
import {
  compareReportLabels,
  formatReportTableTitle,
} from '@/components/page-speed/shared/reportLabels';

function createColumns(
  rows: DetailTableItem[],
  deviceLabel: string,
  auditId: string | undefined,
  timeRange: NetworkRequestTimeRange | null
): ColumnDef<TableItem | OpportunityItem, ItemValue | undefined>[] {
  const firstRow = rows[0];
  if (!firstRow) {
    return [];
  }

  const sColumnHelper = createColumnHelper<TableItem | OpportunityItem>();

  let headingsToUse =
    isNetworkRequestsAudit(auditId)
      ? firstRow.auditResult.details.headings.filter(
          (heading) =>
            heading.key != null &&
            !WATERFALL_REPLACED_NETWORK_REQUEST_KEYS.includes(heading.key),
        )
      : firstRow.auditResult.details.headings;
  if (isNetworkRequestsAudit(auditId)) {
    headingsToUse = sortHeadingsByKeyOrder(headingsToUse, NETWORK_REQUESTS_COLUMN_ORDER);
  }

  const baseColumns = headingsToUse
    .map((h, i) => {
      if (!h.key) {
        return null;
      }
      const key = h.key as keyof TableItem;
      return sColumnHelper.accessor((r) => r[key] ?? undefined, {
        id: `${i}_${key}`,
        header: `${h.label || toTitleCase(key as string)}`,
        enableSorting: canSort(h.valueType),
        sortingFn: 'alphanumeric',
        enableColumnFilter: canGroup(h.valueType) || isNumberColumn(h.valueType),
        filterFn: canGroup(h.valueType)
          ? 'includesString'
          : isNumberColumn(h.valueType)
            ? 'inNumberRange'
            : undefined,
        enableResizing: true,
        minSize: 200,
        cell: (info) => {
          const value = info.getValue();
          return (
            <RenderTableValue
              value={value as ItemValue}
              heading={h}
              device={deviceLabel}
            />
          );
        },
        meta: {
          heading: { heading: h },
        },
      });
    })
    .filter((v) => !!v) as ColumnDef<TableItem | OpportunityItem, ItemValue | undefined>[];

  if (isNetworkRequestsAudit(auditId) && timeRange) {
    const waterfallCol = sColumnHelper.display({
      id: 'waterfall',
      header: 'Waterfall',
      enableSorting: false,
      enableColumnFilter: false,
      enableResizing: true,
      minSize: 120,
      size: 300,
      cell: (info) => {
        const row = info.row.original as TableItem & { networkRequestTime?: number; networkEndTime?: number; resourceType?: string };
        const start = typeof row.networkRequestTime === 'number' ? row.networkRequestTime : 0;
        const end = typeof row.networkEndTime === 'number' ? row.networkEndTime : start;
        return (
          <NetworkWaterfallCell
            requestTime={start}
            endTime={end}
            minStart={timeRange.minStart}
            maxEnd={timeRange.maxEnd}
            resourceType={typeof row.resourceType === 'string' ? row.resourceType : undefined}
            showTimeLabels
          />
        );
      },
    });
    return [...baseColumns, waterfallCol];
  }

  return baseColumns;
}

function getSortedReports(
  rowsByReport: Map<string, DetailTableItem[]>
): Array<{ reportLabel: string; reportRows: DetailTableItem[]; data: (TableItem | OpportunityItem)[] }> {
  return Array.from(rowsByReport.entries())
    .sort(([labelA], [labelB]) => compareReportLabels(labelA, labelB))
    .map(([reportLabel, reportRows]) => {
      const data = reportRows.flatMap((r) => {
        const details = r.auditResult?.details as AuditDetailTable;
        return details?.items || [];
      });

      if (data.length === 0) {
        return null;
      }

      return { reportLabel, reportRows, data };
    })
    .filter((v) => v !== null) as Array<{ reportLabel: string; reportRows: DetailTableItem[]; data: (TableItem | OpportunityItem)[] }>;
}

/**
 * Component that renders one table per report for audits configured to show separate tables.
 * This is useful for audits like dom-size-insight where you want to see each report's data separately.
 */
export function DetailTableSeparatePerReport({
  rows,
  title,
}: {
  rows: DetailTableItem[];
  title: string;
}) {
  const rowsByReport = useMemo(() => {
    const grouped = new Map<string, DetailTableItem[]>();
    rows.forEach((row) => {
      const label = row._userLabel || 'Unknown';
      if (!grouped.has(label)) {
        grouped.set(label, []);
      }
      grouped.get(label)!.push(row);
    });
    return grouped;
  }, [rows]);

  const sortedReports = getSortedReports(rowsByReport);
  const auditId = (rows[0]?.auditResult as { id?: string })?.id;

  return (
    <Accordion type="single" collapsible className="w-full">
      {sortedReports.map(({ reportLabel, data }) => {
        const accordionValue = `${title}-${reportLabel}`.replace(/\s+/g, '-').toLowerCase();
        const reportTitle = formatReportTableTitle(title, reportLabel, data.length);
        return (
          <AccordionItem key={accordionValue} value={accordionValue}>
            <AccordionTrigger>
              <div className="text-base font-semibold text-left">
                {reportTitle}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <ReportTable reportLabel={reportLabel} data={data} rows={rows} auditId={auditId} />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
function ReportTable({ reportLabel, data, rows, auditId }: { reportLabel: string; data: (TableItem | OpportunityItem)[]; rows: DetailTableItem[]; auditId?: string }) {
  "use no memo";
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const timeRange = useMemo(
    () => (isNetworkRequestsAudit(auditId) ? getNetworkRequestsTimeRange(data) : null),
    [auditId, data],
  );
  const reportColumns = createColumns(rows, reportLabel, auditId, timeRange);
  const table = useReactTable({
    columns: reportColumns,
    data,
    getCoreRowModel: getCoreRowModel(),
    enableSorting: true,
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    enableColumnFilters: true,
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    filterFns: {
      booleanFilterFn,
    },
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div className="w-full overflow-x-auto">
      <Table className="w-full" style={{ width: '100%' }}>
        <DataTableHeader table={table} />
        <DataTableBody table={table} />
      </Table>
    </div>
  );
};