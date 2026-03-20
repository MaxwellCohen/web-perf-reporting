'use client';
'use no memo';
import type { CSSProperties } from 'react';
import { TableRow, TableHead } from '@/components/ui/table';
import { flexRender } from '@tanstack/react-table';
import type { Header, HeaderGroup } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import type { TreeMapNode } from '@/lib/schema';

const DEPTH_OFFSET_REM = 2.25;

type JSUsageTableHeaderProps = {
  headerGroup: HeaderGroup<TreeMapNode>;
  depth: number;
  i: number;
};

function getHeaderCellStyle(header: Header<TreeMapNode, unknown>): CSSProperties | undefined {
  const size = header.column.getSize();
  return typeof size === 'number' ? { width: `${size}px` } : undefined;
}

export function JSUsageTableHeader({
  headerGroup,
  depth,
  i,
}: JSUsageTableHeaderProps) {
  'use no memo';

  const rowKey = `${headerGroup.id}_${i}_${depth}`;
  const style = { '--depthOffset': `${depth * DEPTH_OFFSET_REM}rem` } as CSSProperties;

  return (
    <TableRow
      key={rowKey}
      className={cn(
        'flex h-auto w-full overflow-hidden border-2 border-l-0 px-0 py-0',
        depth !== 0 && 'self-end',
      )}
      style={style}
    >
      {headerGroup.headers.map((header) => (
        <TableHead
          key={`${header.id}_${rowKey}`}
          className={cn(
            'min-w-0 overflow-hidden border-none',
            header.column.columnDef.meta?.className,
          )}
          style={getHeaderCellStyle(header)}
        >
          {flexRender(header.column.columnDef.header, header.getContext())}
        </TableHead>
      ))}
    </TableRow>
  );
}
