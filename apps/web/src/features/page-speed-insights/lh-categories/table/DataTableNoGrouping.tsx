"use client";
import { DetailTableSection } from "@/features/page-speed-insights/lh-categories/table/DetailTableSection";
import { TableCard } from "@/features/page-speed-insights/shared/TableCard";
import {
  useSimpleTable,
  type FlatColumnDef,
} from "@/features/page-speed-insights/tanstack-table-v9/useSimpleTable";
import type { RowData } from "@tanstack/react-table";

export function DataTableNoGrouping<T extends RowData>({
  data,
  columns,
  title,
}: {
  data: T[];
  columns: FlatColumnDef<T>[];
  title: string;
}) {
  const table = useSimpleTable({ data, columns });

  return (
    <DetailTableSection title={title}>
      <TableCard.Table table={table} />
    </DetailTableSection>
  );
}
