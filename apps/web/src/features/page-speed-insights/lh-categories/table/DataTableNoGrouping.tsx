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
}: {
  data: T[];
  columns: FlatColumnDef<T>[];
  title: string;
}) {
  const table = useSimpleTable({ data, columns });

  return (
    <AccordionItem value={title}>
      <AccordionSectionTitleTrigger>{toTitleCase(title)}</AccordionSectionTitleTrigger>
      <AccordionContent>
        <div className="w-full overflow-x-auto">
          <StockDataTable table={table} className="w-full" style={{ width: "100%" }} />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
