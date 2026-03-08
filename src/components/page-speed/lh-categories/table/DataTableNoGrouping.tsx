'use client';
import { Table } from '@/components/ui/table';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ColumnDef } from '@tanstack/react-table';
import { DataTableHeader } from '@/components/page-speed/lh-categories/table/DataTableHeader';
import { DataTableBody } from '@/components/page-speed/lh-categories/table/DataTableBody';
import { toTitleCase } from '@/components/page-speed/toTitleCase';
import { useSimpleTable } from '@/components/page-speed/shared/useSimpleTable';
export { booleanFilterFn } from '@/components/page-speed/shared/filterFns';

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
  'use no memo';
  const table = useSimpleTable({ data, columns });

  return (
    <AccordionItem value={title}>
      <AccordionTrigger>
        <div className="text-lg font-bold group-hover:underline">{toTitleCase(title)}</div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="w-full overflow-x-auto">
          <Table className="w-full" style={{ width: '100%' }}>
            <DataTableHeader table={table} />
            <DataTableBody table={table} />
          </Table>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
  