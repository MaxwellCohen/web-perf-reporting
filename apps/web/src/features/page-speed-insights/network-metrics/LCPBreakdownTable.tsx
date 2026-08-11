"use client";

import { useMemo } from "react";
import { StockDataTable } from "@/features/page-speed-insights/tanstack-table-v9/StockDataTable";
import {
  useSimpleTable,
  type FlatColumnDef,
} from "@/features/page-speed-insights/tanstack-table-v9/useSimpleTable";
import { createStockColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";
import {
  createOptionalNumericCell,
} from "@/features/page-speed-insights/shared/tableColumnHelpers";
import { RenderMSValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import type { LCPBreakdownTableRow } from "./lcpBreakdownSelectors";

type Props = {
  tableRows: LCPBreakdownTableRow[];
  reportLabels: string[];
};

const columnHelper = createStockColumnHelper<LCPBreakdownTableRow>();

export function LCPBreakdownTable({ tableRows, reportLabels }: Props) {
  const columns = useMemo(
    () =>
      [
        columnHelper.accessor("label", {
          id: "subpart",
          header: "Subpart",
          enableSorting: true,
          enableResizing: true,
          size: 160,
          minSize: 100,
          filterFn: "includesString",
          cell: (info) => <span className="font-medium">{info.getValue()}</span>,
        }),
        ...reportLabels.map((label) =>
          columnHelper.accessor((row) => row.valuesByReportLabel[label], {
            id: label,
            header: label,
            enableSorting: true,
            enableResizing: true,
            size: 140,
            minSize: 96,
            filterFn: "inNumberRange",
            cell: (info) =>
              createOptionalNumericCell(RenderMSValue, info.getValue() as number | undefined),
          }),
        ),
      ] as FlatColumnDef<LCPBreakdownTableRow>[],
    [reportLabels],
  );

  const table = useSimpleTable({ data: tableRows, columns });

  return <StockDataTable table={table} />;
}
