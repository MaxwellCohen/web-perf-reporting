"use client";
import { AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { AccordionSectionTitleTrigger } from "@/components/ui/accordion-section-title-trigger";
import { StockDataTable } from "@/features/page-speed-insights/tanstack-table-v9/StockDataTable";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import {
  useSimpleTable,
  type FlatColumnDef,
} from "@/features/page-speed-insights/tanstack-table-v9/useSimpleTable";
import type { RowData } from "@tanstack/react-table";

export function DataTableNoGrouping<T extends RowData>({
  data,
  columns,
  title,
  embedded = false,
}: {
  data: T[];
  columns: FlatColumnDef<T>[];
  title: string;
  embedded?: boolean;
}) {
  const table = useSimpleTable({ data, columns });

  if (embedded) {
    return (
      <div className="w-full overflow-x-auto">
        <StockDataTable table={table} />
      </div>
    );
  }

  return (
    <AccordionItem value={title}>
      <AccordionSectionTitleTrigger>{toTitleCase(title)}</AccordionSectionTitleTrigger>
      <AccordionContent>
        <div className="w-full overflow-x-auto">
          <StockDataTable table={table} />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
