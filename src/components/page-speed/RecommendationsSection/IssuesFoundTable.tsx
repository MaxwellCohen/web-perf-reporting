'use client';
import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Table } from '@/components/ui/table';
import { DataTableHeader } from '@/components/page-speed/lh-categories/table/DataTableHeader';
import { DataTableBody } from '@/components/page-speed/lh-categories/table/DataTableBody';
import type { TableColumnHeading, TableItem } from '@/lib/schema';
import { useSimpleTable } from '@/components/page-speed/shared/useSimpleTable';
import { getFilterFnForValueType, getColumnSize } from '@/components/page-speed/shared/tableColumnUtils';
import { IssuesFoundTableCell } from '@/components/page-speed/RecommendationsSection/IssuesFoundTableCell';

interface IssuesFoundTableProps {
  headings: TableColumnHeading[];
  items: TableItem[];
  device: string;
}

export function IssuesFoundTable({ headings, items, device }: IssuesFoundTableProps) {
  "use no memo";

  // Create column definitions from headings
  const columns = useMemo<ColumnDef<TableItem>[]>(() => {
    return headings.map((heading) => {
      const key = heading.key || '';
      const label = typeof heading.label === 'string' ? heading.label : key;
      const valueType = heading.valueType;
      const filterFn = getFilterFnForValueType(valueType);
      const initialSize = getColumnSize(key, label, valueType);

      const columnDef: ColumnDef<TableItem> = {
        id: key,
        accessorKey: key,
        header: label,
        size: initialSize,
        minSize: 50,
        maxSize: 800,
        enableResizing: true,
        ...(filterFn && { filterFn }),
        meta: {
          heading: {
            heading,
          },
        },
        cell: ({ row }) => {
          const value = row.original[key];
          const subItems = row.original.subItems;

          return (
            <IssuesFoundTableCell
              value={value}
              subItems={subItems}
              heading={heading}
              device={device}
            />
          );
        },
        enableSorting: true,
        enableColumnFilter: true,
      };

      return columnDef;
    });
  }, [headings, device]);

  const table = useSimpleTable({
    data: items,
    columns,
  });

  return (
    <div className="w-full overflow-x-auto">
      <Table className="w-full">
        <DataTableHeader table={table} />
        <DataTableBody table={table} />
      </Table>
    </div>
  );
}

