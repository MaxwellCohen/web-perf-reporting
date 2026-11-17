import { StockDataTable } from "@/features/page-speed-insights/tanstack-table-v9/StockDataTable";
import { useStandardTable } from "@/features/page-speed-insights/tanstack-table-v9/useStandardTable";
import type { StockAnyColumnDef } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { createStockColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";
import { createOptionalNumericCell } from "@/features/page-speed-insights/shared/tableColumnHelpers";
import { RenderMSValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import type { LCPBreakdownTableRow } from "./lcpBreakdownSelectors";

type Props = {
  tableRows: LCPBreakdownTableRow[];
  reportLabels: string[];
};

const columnHelper = createStockColumnHelper<LCPBreakdownTableRow>();

export function LCPBreakdownTable({ tableRows, reportLabels }: Props) {
  const columns = [
    columnHelper.accessor("label", {
      id: "subpart",
      header: "Subpart",
      enableSorting: false,
      enableColumnFilter: false,
      enableResizing: true,
      size: 160,
      minSize: 100,
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    }),
    ...reportLabels.map((label) =>
      columnHelper.accessor((row) => row.valuesByReportLabel[label], {
        id: label,
        header: label,
        enableSorting: false,
        enableColumnFilter: false,
        enableResizing: true,
        size: 180,
        minSize: 120,
        cell: (info) =>
          createOptionalNumericCell(RenderMSValue, info.getValue() as number | undefined),
      }),
    ),
  ] as StockAnyColumnDef<LCPBreakdownTableRow>[];

  const table = useStandardTable({ data: tableRows, columns });

  return <StockDataTable table={table} />;
}
