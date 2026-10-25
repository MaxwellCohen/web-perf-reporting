"use client";

import { useMemo } from "react";
import {
  urlsMatch,
  type CombinedLoad,
} from "@/features/page-speed-insights/page-load-timeline/collectTimelineSources";
import { renderBoolean } from "@/features/page-speed-insights/lh-categories/renderBoolean";
import {
  createBytesColumn,
  createMSColumn,
  createPercentageColumn,
  createURLColumn,
  metricTableEmptyDisplay,
} from "@/features/page-speed-insights/shared/tableColumnHelpers";
import { TableCard } from "@/features/page-speed-insights/shared/TableCard";
import { createStockColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";
import {
  useStandardTable,
  type StandardColumnDef,
} from "@/features/page-speed-insights/tanstack-table-v9/useStandardTable";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import {
  resourcesTableFromLoad,
  type ResourceTableRow,
} from "@/features/page-speed-insights/dashboard-view/resources-story/resourcesTableModel";

const PAGE_SIZE = 25;

const columnHelper = createStockColumnHelper<ResourceTableRow>();

function withNumericSort(
  column: StandardColumnDef<ResourceTableRow>,
): StandardColumnDef<ResourceTableRow> {
  return { ...column, sortFn: "basic" };
}

const columns: StandardColumnDef<ResourceTableRow>[] = [
  createURLColumn(columnHelper, { maxWidthClass: "max-w-80", size: 280 }),
  columnHelper.accessor("resourceType", {
    id: "resourceType",
    header: "Type",
    enableSorting: true,
    enableResizing: true,
    filterFn: "includesString",
    cell: (info) => toTitleCase(String(info.getValue() ?? "")),
  }),
  columnHelper.accessor("statusCode", {
    id: "statusCode",
    header: "Status",
    enableSorting: true,
    enableResizing: true,
    sortFn: "basic",
    filterFn: "inNumberRange",
    size: 90,
    cell: (info) => {
      const value = info.getValue() as number | undefined;
      return value !== undefined ? value : metricTableEmptyDisplay();
    },
  }),
  withNumericSort(createBytesColumn(columnHelper, "transferSize", "Transfer")),
  withNumericSort(createBytesColumn(columnHelper, "resourceSize", "Size")),
  withNumericSort(createPercentageColumn(columnHelper, "unusedShare", "Unused %")),
  withNumericSort(createBytesColumn(columnHelper, "unusedBytes", "Unused bytes")),
  columnHelper.accessor("longTaskCount", {
    id: "longTaskCount",
    header: "Long tasks",
    enableSorting: true,
    enableResizing: true,
    sortFn: "basic",
    filterFn: "inNumberRange",
    size: 110,
    cell: (info) => info.getValue(),
  }),
  withNumericSort(createMSColumn(columnHelper, "longTaskMs", "Long-task ms")),
  withNumericSort(createMSColumn(columnHelper, "scriptCpuMs", "Script CPU")),
  columnHelper.accessor("priority", {
    id: "priority",
    header: "Priority",
    enableSorting: true,
    enableResizing: true,
    filterFn: "includesString",
    cell: (info) => {
      const value = info.getValue() as string | undefined;
      return value || metricTableEmptyDisplay();
    },
  }),
  columnHelper.accessor("renderBlocking", {
    id: "renderBlocking",
    header: "Blocking",
    enableSorting: true,
    enableResizing: true,
    filterFn: "includesString",
    cell: (info) => toTitleCase(String(info.getValue() ?? "").replaceAll("-", " ")),
  }),
  columnHelper.accessor("isCriticalChain", {
    id: "isCriticalChain",
    header: "Chain",
    enableSorting: true,
    enableResizing: true,
    filterFn: "booleanFilterFn" as never,
    size: 90,
    cell: (info) => renderBoolean(!!info.getValue()),
  }),
  columnHelper.accessor("entity", {
    id: "entity",
    header: "Entity",
    enableSorting: true,
    enableResizing: true,
    filterFn: "includesString",
    cell: (info) => {
      const value = info.getValue() as string | undefined;
      return value || metricTableEmptyDisplay();
    },
  }),
];

export function ResourcesTable({
  load,
  selectedUrl,
  onSelectSuspect,
}: {
  load: CombinedLoad;
  selectedUrl: string | null;
  onSelectSuspect?: (url: string) => void;
}) {
  const rows = useMemo(() => resourcesTableFromLoad(load), [load]);
  const table = useStandardTable({
    data: rows,
    columns,
    enablePagination: true,
    defaultPageSize: PAGE_SIZE,
    initialSorting: [{ id: "transferSize", desc: true }],
  });

  if (!rows.length) return null;

  return (
    <TableCard
      title="Downloaded resources"
      className="border bg-card shadow-none"
      table={table}
      showPagination
      pageSize={PAGE_SIZE}
      tableAriaLabel="Downloaded resources"
      onRowClick={onSelectSuspect ? (row) => onSelectSuspect(row.url) : undefined}
      isRowSelected={selectedUrl ? (row) => urlsMatch(row.url, selectedUrl) : undefined}
      showColumnLayout
    />
  );
}
