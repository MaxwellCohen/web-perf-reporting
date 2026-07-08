"use client";

import type { RowData } from "@tanstack/react-table";
import type { ButtonProps } from "@/components/ui/button";
import type { StockTable } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { CopyTableMenuButton } from "@/features/page-speed-insights/tanstack-table-v9/CopyTableMenuButton";
import { tableToCsv } from "@/features/page-speed-insights/tanstack-table-v9/tableToCsv";
import { tableToMarkdown } from "@/features/page-speed-insights/tanstack-table-v9/tableToMarkdown";

type CopyTableButtonProps<TData extends RowData> = Omit<ButtonProps, "onClick"> & {
  table: StockTable<TData>;
  resetDelay?: number;
};

export function CopyTableButton<TData extends RowData>({
  table,
  ...props
}: CopyTableButtonProps<TData>) {
  return (
    <CopyTableMenuButton
      getCopyText={(format) => (format === "csv" ? tableToCsv(table) : tableToMarkdown(table))}
      {...props}
    />
  );
}
