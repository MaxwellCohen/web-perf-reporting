"use client";
import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Table, TableCaption } from "@/components/ui/table";
import { DataTableHeader } from "@/features/page-speed-insights/lh-categories/table/DataTableHeader";
import { DataTableBody } from "@/features/page-speed-insights/lh-categories/table/DataTableBody";
import type { TableColumnHeading, TableItem } from "@/lib/schema";
import { useSimpleTable } from "@/features/page-speed-insights/shared/useSimpleTable";
import {
  getFilterFnForValueType,
  getColumnSize,
} from "@/features/page-speed-insights/shared/tableColumnUtils";
import { IssuesFoundTableCell } from "@/features/page-speed-insights/RecommendationsSection/IssuesFoundTableCell";
import { NetworkWaterfallCell } from "@/features/page-speed-insights/lh-categories/table/NetworkWaterfallCell";
import { cn } from "@/lib/utils";
import {
  getNetworkRequestsTimeRange,
  isNetworkRequestsTable,
  NETWORK_REQUESTS_COLUMN_ORDER,
  sortHeadingsByKeyOrder,
  WATERFALL_REPLACED_NETWORK_REQUEST_KEYS,
} from "@/features/page-speed-insights/shared/networkRequestsTable";

interface IssuesFoundTableProps {
  headings: TableColumnHeading[];
  items: TableItem[];
  device: string;
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
  url: "URL",
  protocol: "Protocol",
  transferSize: "Transfer",
  resourceSize: "Size",
  statusCode: "Status",
  mimeType: "MIME type",
  resourceType: "Resource type",
  waterfall: "Waterfall",
};

function getHeaderLabel(key: string, fallback: string, isNetworkRequests: boolean): string {
  if (isNetworkRequests && key in HEADER_LABEL_OVERRIDES) {
    return HEADER_LABEL_OVERRIDES[key];
  }
  return fallback;
}

function deduplicateRowsByColumnValues(
  items: TableItem[],
  headings: TableColumnHeading[],
): TableItem[] {
  const keys = headings.map((h) => h.key).filter((k): k is string => k != null);
  if (keys.length === 0) return items;
  const seen = new Set<string>();
  const result: TableItem[] = [];
  for (const item of items) {
    const rowKey = keys.map((k) => String(item[k] ?? "")).join("\u200b");
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
    let headingsToUse = isNetworkRequests
      ? headings.filter(
          (heading) =>
            heading.key != null && !WATERFALL_REPLACED_NETWORK_REQUEST_KEYS.includes(heading.key),
        )
      : headings;
    if (isNetworkRequests) {
      headingsToUse = sortHeadingsByKeyOrder(headingsToUse, NETWORK_REQUESTS_COLUMN_ORDER);
    }

    const baseColumns = headingsToUse.map((heading) => {
      const key = heading.key || "";
      const rawLabel = typeof heading.label === "string" ? heading.label : key;
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
          if (key === "url" && value != null) {
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
        id: "waterfall",
        accessorKey: "url",
        header: "Waterfall",
        size: NETWORK_REQUESTS_COLUMN_SIZES.waterfall,
        minSize: 100,
        maxSize: 400,
        enableResizing: true,
        enableSorting: false,
        enableColumnFilter: false,
        cell: ({ row }) => {
          const r = row.original as TableItem & {
            networkRequestTime?: number;
            networkEndTime?: number;
            resourceType?: string;
          };
          const start = typeof r.networkRequestTime === "number" ? r.networkRequestTime : 0;
          const end = typeof r.networkEndTime === "number" ? r.networkEndTime : start;
          return (
            <NetworkWaterfallCell
              requestTime={start}
              endTime={end}
              minStart={timeRange.minStart}
              maxEnd={timeRange.maxEnd}
              resourceType={typeof r.resourceType === "string" ? r.resourceType : undefined}
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
            "w-full text-sm",
            "[&_thead]:bg-muted/50 [&_thead_tr]:border-b [&_th]:py-2 [&_th]:px-2.5 [&_th]:text-sm [&_th]:font-semibold [&_th]:text-foreground [&_th]:whitespace-nowrap [&_th]:align-bottom",
            "[&_td]:py-1 [&_td]:px-2 [&_td]:text-xs",
            isNetworkRequests &&
              "[&_tbody_tr:nth-child(even)]:bg-muted/25 [&_tbody_tr:hover]:bg-muted/40",
          )}
        >
          {isNetworkRequests && (
            <TableCaption className="sr-only">
              {device} – network requests ({deduplicatedItems.length}{" "}
              {deduplicatedItems.length === 1 ? "request" : "requests"})
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
