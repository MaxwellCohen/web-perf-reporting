"use client";
import { DetailTableSection } from "@/features/page-speed-insights/lh-categories/table/DetailTableSection";
import { TableCard } from "@/features/page-speed-insights/shared/TableCard";
import { useStandardTable } from "@/features/page-speed-insights/tanstack-table-v9/useStandardTable";
import type { StockAnyColumnDef } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import type { RowData } from "@tanstack/react-table";

export function DataTableNoGrouping<T extends RowData>({
  data,
  columns,
  title,
}: {
  data: T[];
  columns: StockAnyColumnDef<T>[];
  title: string;
}) {
  const table = useStandardTable({ data, columns });

  return (
    <DetailTableSection title={title}>
      <TableCard.Table table={table} />
    </DetailTableSection>
  );
}
