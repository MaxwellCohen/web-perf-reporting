'use client';
import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Table, TableCaption } from '@/components/ui/table';
import { DataTableHeader } from '@/components/page-speed/lh-categories/table/DataTableHeader';
import { DataTableBody } from '@/components/page-speed/lh-categories/table/DataTableBody';
import type { TableColumnHeading, TableItem } from '@/lib/schema';
import { useSimpleTable } from '@/components/page-speed/shared/useSimpleTable';
import { getFilterFnForValueType, getColumnSize } from '@/components/page-speed/shared/tableColumnUtils';
import { IssuesFoundTableCell } from '@/components/page-speed/RecommendationsSection/IssuesFoundTableCell';
import { NetworkWaterfallCell } from '@/components/page-speed/lh-categories/table/NetworkWaterfallCell';
import { cn } from '@/lib/utils';

interface IssuesFoundTableProps {
  headings: TableColumnHeading[];
  items: TableItem[];
  device: string;
}

const NETWORK_REQUEST_KEYS = ['networkRequestTime', 'networkEndTime'];

/** Columns hidden when showing waterfall (timing shown on the bar instead) */
const WATERFALL_REPLACES_COLUMN_KEYS = ['networkRequestTime', 'networkEndTime'];

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

/** Compact column widths for network-requests table to reduce horizontal scroll */
const NETWORK_REQUESTS_COLUMN_SIZES: Record<string, number> = {
  url: 140,
  protocol: 56,
  transferSize: 68,
  resourceSize: 68,
  statusCode: 52,
  mimeType: 72,
  resourceType: 76,
  waterfall: 220,
};

/** Short, scannable header labels for network-requests table */
const HEADER_LABEL_OVERRIDES: Record<string, string> = {
  url: 'URL',
  protocol: 'Protocol',
  transferSize: 'Transfer',
  resourceSize: 'Size',
  statusCode: 'Status',
  mimeType: 'MIME type',
  resourceType: 'Resource type',
  waterfall: 'Waterfall',
};

function getHeaderLabel(key: string, fallback: string, isNetworkRequests: boolean): string {
  if (isNetworkRequests && key in HEADER_LABEL_OVERRIDES) {
    return HEADER_LABEL_OVERRIDES[key];
  }
  return fallback;
}

function isNetworkRequestsTable(headings: TableColumnHeading[]): boolean {
  const keys = new Set(headings.map((h) => h.key).filter((k): k is string => k != null));
  return NETWORK_REQUEST_KEYS.every((k) => keys.has(k));
}

function getNetworkRequestsTimeRange(items: TableItem[]): { minStart: number; maxEnd: number } | null {
  let minStart = Infinity;
  let maxEnd = -Infinity;
  for (const row of items) {
    const item = row as TableItem & { networkRequestTime?: number; networkEndTime?: number };
    const start = typeof item.networkRequestTime === 'number' ? item.networkRequestTime : NaN;
    const end = typeof item.networkEndTime === 'number' ? item.networkEndTime : NaN;
    if (!Number.isNaN(start)) minStart = Math.min(minStart, start);
    if (!Number.isNaN(end)) maxEnd = Math.max(maxEnd, end);
  }
  if (minStart === Infinity || maxEnd === -Infinity || minStart >= maxEnd) return null;
  return { minStart, maxEnd };
}

function deduplicateRowsByColumnValues(items: TableItem[], headings: TableColumnHeading[]): TableItem[] {
  const keys = headings.map((h) => h.key).filter((k): k is string => k != null);
  if (keys.length === 0) return items;
  const seen = new Set<string>();
  const result: TableItem[] = [];
  for (const item of items) {
    const rowKey = keys.map((k) => String(item[k] ?? '')).join('\u200b');
    if (seen.has(rowKey)) continue;
    seen.add(rowKey);
    result.push(item);
  }
  return result;
}

export function IssuesFoundTable({ headings, items, device }: IssuesFoundTableProps) {
  "use no memo";

  const deduplicatedItems = useMemo(
    () => deduplicateRowsByColumnValues(items, headings),
    [items, headings],
  );

  const isNetworkRequests = isNetworkRequestsTable(headings);
  const timeRange = useMemo(
    () => (isNetworkRequests ? getNetworkRequestsTimeRange(deduplicatedItems) : null),
    [isNetworkRequests, deduplicatedItems],
  );

  // Create column definitions from headings
  const columns = useMemo<ColumnDef<TableItem>[]>(() => {
    let headingsToUse =
      isNetworkRequests
        ? headings.filter((h) => h.key != null && !WATERFALL_REPLACES_COLUMN_KEYS.includes(h.key))
        : headings;
    if (isNetworkRequests) {
      headingsToUse = sortHeadingsByOrder(headingsToUse, [...NETWORK_REQUESTS_COLUMN_ORDER]);
    }

    const baseColumns = headingsToUse.map((heading) => {
      const key = heading.key || '';
      const rawLabel = typeof heading.label === 'string' ? heading.label : key;
      const label = getHeaderLabel(key, rawLabel, isNetworkRequests);
      const valueType = heading.valueType;
      const filterFn = getFilterFnForValueType(valueType);
      const initialSize =
        isNetworkRequests && key in NETWORK_REQUESTS_COLUMN_SIZES
          ? NETWORK_REQUESTS_COLUMN_SIZES[key]
          : getColumnSize(key, label, valueType);

      const columnDef: ColumnDef<TableItem> = {
        id: key,
        accessorKey: key,
        header: label,
        size: initialSize,
        minSize: isNetworkRequests ? 40 : 50,
        maxSize: 800,
        enableResizing: true,
        ...(filterFn && { filterFn }),
        meta: {
          heading: {
            heading,
          },
        },
        cell: ({ row }) => {
          const value = row.original[key];
          const subItems = row.original.subItems;
          const content = (
            <IssuesFoundTableCell
              value={value}
              subItems={subItems}
              heading={heading}
              device={device}
            />
          );
          if (key === 'url' && value != null) {
            return (
              <div className="truncate min-w-0" title={String(value)}>
                {content}
              </div>
            );
          }
          return content;
        },
        enableSorting: true,
        enableColumnFilter: true,
      };

      return columnDef;
    });

    if (isNetworkRequests && timeRange) {
      const waterfallColumn: ColumnDef<TableItem> = {
        id: 'waterfall',
        accessorKey: 'url',
        header: 'Waterfall',
        size: NETWORK_REQUESTS_COLUMN_SIZES.waterfall,
        minSize: 100,
        maxSize: 400,
        enableResizing: true,
        enableSorting: false,
        enableColumnFilter: false,
        cell: ({ row }) => {
          const r = row.original as TableItem & { networkRequestTime?: number; networkEndTime?: number; resourceType?: string };
          const start = typeof r.networkRequestTime === 'number' ? r.networkRequestTime : 0;
          const end = typeof r.networkEndTime === 'number' ? r.networkEndTime : start;
          return (
            <NetworkWaterfallCell
              requestTime={start}
              endTime={end}
              minStart={timeRange.minStart}
              maxEnd={timeRange.maxEnd}
              resourceType={typeof r.resourceType === 'string' ? r.resourceType : undefined}
              width={200}
              barHeight={12}
              showTimeLabels
            />
          );
        },
      };
      baseColumns.push(waterfallColumn);
    }

    return baseColumns;
  }, [headings, device, isNetworkRequests, timeRange]);

  const table = useSimpleTable({
    data: deduplicatedItems,
    columns,
  });

  const timeRangeMs =
    timeRange != null
      ? { start: Math.round(timeRange.minStart), end: Math.round(timeRange.maxEnd) }
      : null;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
      <div className="w-full overflow-x-auto">
        <Table
          aria-label={isNetworkRequests ? `Network requests for ${device}` : undefined}
          className={cn(
            'w-full text-sm',
            '[&_thead]:bg-muted/50 [&_thead_tr]:border-b [&_th]:py-2 [&_th]:px-2.5 [&_th]:text-sm [&_th]:font-semibold [&_th]:text-foreground [&_th]:whitespace-nowrap [&_th]:align-bottom',
            '[&_td]:py-1 [&_td]:px-2 [&_td]:text-xs',
            isNetworkRequests &&
              '[&_tbody_tr:nth-child(even)]:bg-muted/25 [&_tbody_tr:hover]:bg-muted/40'
          )}
        >
          {isNetworkRequests && (
            <TableCaption className="sr-only">
              {device} – network requests ({deduplicatedItems.length} {deduplicatedItems.length === 1 ? 'request' : 'requests'})
            </TableCaption>
          )}
          <DataTableHeader table={table} />
          <DataTableBody table={table} />
        </Table>
      </div>
      {isNetworkRequests && timeRangeMs && (
        <div className="px-2 py-1 text-[11px] text-muted-foreground border-t border-border bg-muted/20">
          Timeline: {timeRangeMs.start.toLocaleString()} ms → {timeRangeMs.end.toLocaleString()} ms
        </div>
      )}
    </div>
  );
}

