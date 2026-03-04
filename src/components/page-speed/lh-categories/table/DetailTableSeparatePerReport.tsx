'use client';
import { TableItem, OpportunityItem, AuditDetailTable } from '@/lib/schema';
import type { TableColumnHeading } from '@/lib/schema';
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

type TimeRange = { minStart: number; maxEnd: number };

function getNetworkRequestsTimeRange(data: (TableItem | OpportunityItem)[]): TimeRange | null {
  let minStart = Infinity;
  let maxEnd = -Infinity;
  for (const row of data) {
    const item = row as TableItem & { networkRequestTime?: number; networkEndTime?: number };
    const start = typeof item.networkRequestTime === 'number' ? item.networkRequestTime : NaN;
    const end = typeof item.networkEndTime === 'number' ? item.networkEndTime : NaN;
    if (!Number.isNaN(start)) minStart = Math.min(minStart, start);
    if (!Number.isNaN(end)) maxEnd = Math.max(maxEnd, end);
  }
  if (minStart === Infinity || maxEnd === -Infinity || minStart >= maxEnd) return null;
  return { minStart, maxEnd };
}

/** Column order for network-requests table: url, status, protocol, resource, mimeType, transfer, size, waterfall */
const NETWORK_REQUESTS_COLUMN_ORDER = ['url', 'statusCode', 'protocol', 'resourceType', 'mimeType', 'transferSize', 'resourceSize'] as const;

function sortHeadingsByOrder(headings: TableColumnHeading[], order: readonly string[]): TableColumnHeading[] {
  const byKey = new Map(headings.map((h) => [h.key ?? '', h]));
  const ordered: TableColumnHeading[] = [];
  for (const key of order) {
    const h = byKey.get(key);
    if (h) ordered.push(h);
  }
  for (const h of headings) {
    if (!order.includes(h.key ?? '')) ordered.push(h);
  }
  return ordered;
}

function createColumns(
  rows: DetailTableItem[],
  deviceLabel: string,
  auditId: string | undefined,
  timeRange: TimeRange | null
): ColumnDef<TableItem | OpportunityItem, ItemValue | undefined>[] {
  const firstRow = rows[0];
  if (!firstRow) {
    return [];
  }

  const sColumnHelper = createColumnHelper<TableItem | OpportunityItem>();

  const WATERFALL_REPLACES_KEYS = ['networkRequestTime', 'networkEndTime'];
  let headingsToUse =
    auditId === 'network-requests'
      ? firstRow.auditResult.details.headings.filter((h) => h.key != null && !WATERFALL_REPLACES_KEYS.includes(h.key))
      : firstRow.auditResult.details.headings;
  if (auditId === 'network-requests') {
    headingsToUse = sortHeadingsByOrder(headingsToUse, [...NETWORK_REQUESTS_COLUMN_ORDER]);
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

  if (auditId === 'network-requests' && timeRange) {
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

function getReportTitle(reportLabel: string, itemCount: number, title: string): string {
  const auditTitle = toTitleCase(title);
  let formattedLabel = reportLabel;
  if (reportLabel.includes('Mobile')) {
    formattedLabel = 'Mobile';
  } else if (reportLabel.includes('Desktop')) {
    formattedLabel = 'Desktop';
  } else if (reportLabel.includes('All Devices')) {
    formattedLabel = 'All Devices';
  }
  return `${auditTitle} Table for ${formattedLabel} (${itemCount} ${itemCount === 1 ? 'item' : 'items'})`;
}

function getSortedReports(
  rowsByReport: Map<string, DetailTableItem[]>
): Array<{ reportLabel: string; reportRows: DetailTableItem[]; data: (TableItem | OpportunityItem)[] }> {
  return Array.from(rowsByReport.entries())
    .sort(([labelA], [labelB]) => {
      if (labelA === 'All Devices' && labelB !== 'All Devices') return -1;
      if (labelA !== 'All Devices' && labelB === 'All Devices') return 1;
      const order = ['Mobile', 'Desktop'];
      const aIndex = order.findIndex((l) => labelA.includes(l));
      const bIndex = order.findIndex((l) => labelB.includes(l));
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return labelA.localeCompare(labelB);
    })
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
        const reportTitle = getReportTitle(reportLabel, data.length, title);
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
  const timeRange = useMemo(() => (auditId === 'network-requests' ? getNetworkRequestsTimeRange(data) : null), [auditId, data]);
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