'use client';
import { TableBody, TableCell, TableRow } from '@/components/ui/table';
import { flexRender, Table as TableType } from '@tanstack/react-table';
import { cn } from '@/lib/utils';

export function DataTableBody<T>({ table }: { table: TableType<T> }) {
  'use no memo';
  return (
    <TableBody>
      {table.getRowModel().rows.map((row) => {
        return (
          <TableRow key={row.id}>
            {row
              .getVisibleCells()
              .map((cell) => {
                let cellRender = flexRender(
                  cell.column.columnDef.cell,
                  cell.getContext(),
                );
                if (cell.getIsAggregated() || cell.getIsGrouped()) {
                  cellRender = flexRender(
                    cell.column.columnDef.aggregatedCell,
                    cell.getContext(),
                  );
                }

                const isExpanderColumn = cell.column.id === 'expander';
                
                return (
                  <TableCell
                    key={cell.id}
                    className={cn("overflow-x-auto", {
                      "!p-0 flex items-center justify-center overflow-hidden": isExpanderColumn,
                    })}
                    style={{
                      width: `${cell.column.getSize()}px`,
                      ...(isExpanderColumn && {
                        minWidth: `${cell.column.getSize()}px`,
                        maxWidth: `${cell.column.getSize()}px`,
                        boxSizing: 'border-box',
                      }),
                    }}
                    data-cell-id={cell.id}
                    data-column-id={cell.column.id}
                    data-can-expand={`${row.getCanExpand()}`}
                    data-depth={row.depth}
                    data-row-expanded={`${row.getIsExpanded()}`}
                    data-grouped={`${cell.getIsGrouped()}`}
                    data-aggregated={`${cell.getIsAggregated()}`}
                    data-placeholder={`${cell.getIsPlaceholder()}`}
                  >
                    {cellRender}
                  </TableCell>
                );
              })
              .filter((v) => !!v)}
          </TableRow>
        );
      })}
    </TableBody>
  );
}
