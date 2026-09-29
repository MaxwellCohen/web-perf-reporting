"use client";

import { createOptionalNumericCell } from "@/features/page-speed-insights/shared/tableColumnHelpers";
import { RenderMSValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { createStockColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";
import { StockDataTable } from "@/features/page-speed-insights/tanstack-table-v9/StockDataTable";
import {
  useSimpleTable,
  type FlatColumnDef,
} from "@/features/page-speed-insights/tanstack-table-v9/useSimpleTable";
import {
  mainThreadWorkDurationHeader,
  type MainThreadWorkTableRow,
} from "@/features/page-speed-insights/javascript-metrics/mainThreadWorkTable";

type MainThreadWorkBreakdownTableProps = {
  rows: MainThreadWorkTableRow[];
  reportLabels: string[];
};

const columnHelper = createStockColumnHelper<MainThreadWorkTableRow>();

export function MainThreadWorkBreakdownTable({
  rows,
  reportLabels,
}: MainThreadWorkBreakdownTableProps) {
  const columns = [
    columnHelper.accessor("category", {
      id: "category",
      header: "Category",
      enableSorting: true,
      enableResizing: true,
      size: 280,
      minSize: 180,
      filterFn: "includesString",
      cell: (info) => info.getValue(),
    }),
    ...reportLabels.map((label) =>
      columnHelper.accessor((row) => row.valuesByReportLabel[label], {
        id: `duration:${label}`,
        header: mainThreadWorkDurationHeader(label),
        enableSorting: true,
        enableResizing: true,
        size: 260,
        minSize: 220,
        filterFn: "inNumberRange",
        cell: (info) =>
          createOptionalNumericCell(RenderMSValue, info.getValue() as number | undefined),
      }),
    ),
  ] as FlatColumnDef<MainThreadWorkTableRow>[];

  const table = useSimpleTable({ data: rows, columns });

  return <StockDataTable table={table} />;
}
