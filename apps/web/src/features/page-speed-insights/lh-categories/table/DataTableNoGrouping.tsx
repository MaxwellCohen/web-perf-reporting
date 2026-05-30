"use client";
import { Table } from "@/components/ui/table";
import { AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { AccordionSectionTitleTrigger } from "@/components/ui/accordion-section-title-trigger";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableHeader } from "@/features/page-speed-insights/lh-categories/table/DataTableHeader";
import { DataTableBody } from "@/features/page-speed-insights/lh-categories/table/DataTableBody";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import { useSimpleTable } from "@/features/page-speed-insights/shared/useSimpleTable";
export { booleanFilterFn } from "@/features/page-speed-insights/shared/filterFns";

export function DataTableNoGrouping<T>({
  data,
  columns,
  title,
}: {
  data: T[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[];
  title: string;
}) {
  "use no memo";
  const table = useSimpleTable({ data, columns });

  return (
    <AccordionItem value={title}>
      <AccordionSectionTitleTrigger>{toTitleCase(title)}</AccordionSectionTitleTrigger>
      <AccordionContent>
        <div className="w-full overflow-x-auto">
          <Table className="w-full" style={{ width: "100%" }}>
            <DataTableHeader table={table} />
            <DataTableBody table={table} />
          </Table>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
