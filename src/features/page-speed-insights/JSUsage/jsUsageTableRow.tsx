'use client';
'use no memo';
import { TableRow, TableCell } from '@/components/ui/table';
import { flexRender } from '@tanstack/react-table';
import type { Row } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import type { TreeMapNode } from '@/lib/schema';

export function JSUsageTableRow({
  row,
  i,
}: {
  row: Row<TreeMapNode>;
  i: number;
}) {
  'use no memo';
  const isExpanded = row.getIsExpanded();
  const depth = row.depth + (isExpanded ? 1 : 0);
  const subRows = row?.getParentRow()?.subRows || [];

  return (
    <>
      <TableRow
        data-children={row?.original?.children?.length || 0}
        className={cn(
          'w-[calc(100% - 4px)] flex overflow-hidden border-muted',
          {
            'border-b-[length:--depth]':
              depth && row.index + 1 === (subRows.length || 0),
            'border-r-[length:--depth]': depth,
            'border-r-[length:--depth] border-t-[length:--depth]': isExpanded,
            'border-b-[length:--depth] border-muted':
              (depth || isExpanded) &&
              subRows.findIndex((a) => a == row) === subRows.length - 1,
          },
        )}
        style={{
          // @ts-expect-error ts is weird
          '--depth': `${5 * depth}px`,
        }}
        suppressHydrationWarning
      >
        {row
          .getVisibleCells()
          .map((cell, index) => {
            const cellContent = flexRender(
              cell.column.columnDef.cell,
              cell.getContext(),
            );
            return (
              <TableCell
                key={`${cell.id}_${i}_${depth}`}
                data-key={`${cell.id}_${i}_${depth}`}
                data-cell-id={cell.id}
                data-column-id={cell.column.id}
                data-can-expand={`${row.getCanExpand()}`}
                data-depth={row.depth}
                data-row-expanded={`${row.getIsExpanded()}`}
                data-grouped={`${cell.getIsGrouped()}`}
                data-aggregated={`${cell.getIsAggregated()}`}
                data-placeholder={`${cell.getIsPlaceholder()}`}
                className={cn(
                  'flex flex-row',
                  {
                    'border-l-[length:--depth] border-muted':
                      (depth || isExpanded) && !index,
                  },
                  `${cell.column.columnDef.meta?.className || ''}`,
                )}
                style={
                  typeof cell.column.getSize() === 'number'
                    ? {
                        width: `${cell.column.getSize()}px`,
                      }
                    : undefined
                }
                suppressHydrationWarning
              >
                {cellContent}
              </TableCell>
            );
          })
          .filter(Boolean)}
      </TableRow>
    </>
  );
}
