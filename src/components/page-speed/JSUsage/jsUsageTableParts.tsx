'use client';
'use no memo';
import { Button } from '@/components/ui/button';
import { ChevronRightIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CellContext } from '@tanstack/react-table';
import type { TreeMapNode } from '@/lib/schema';
import { RenderBytesValue } from '@/components/page-speed/lh-categories/table/RenderTableValue';
import type { Table as ReactTable } from '@tanstack/react-table';

function ExpandToggleButton({
  isExpanded,
  onClick,
  expandLabel,
  collapseLabel,
  children,
  size = 'icon',
  ariaExpanded,
}: {
  isExpanded: boolean;
  onClick: () => void;
  expandLabel: string;
  collapseLabel: string;
  children?: React.ReactNode;
  size?: 'icon' | 'default';
  ariaExpanded?: boolean;
}) {
  const label = isExpanded ? collapseLabel : expandLabel;
  return (
    <Button
      variant="ghost"
      role="button"
      size={size}
      onClick={onClick}
      style={{ cursor: 'pointer', margin: 0 }}
      aria-label={label}
      aria-expanded={ariaExpanded}
      className="m-0 h-8 w-8"
    >
      {children}
      <ChevronRightIcon
        className={cn('h-4 w-4 transform transition-all duration-300', {
          'rotate-90': isExpanded,
        })}
      />
      <span className="sr-only">{label}</span>
    </Button>
  );
}

export function ExpandRow<T>({
  row,
  children,
}: Pick<Partial<CellContext<T, unknown>>, 'row'> & {
  children?: React.ReactNode;
}) {
  'use no memo';
  if (!row) {
    return <div className="h-9 w-9" />;
  }

  const canExpand = row.getCanExpand();

  if (!canExpand) {
    return <div className="h-9 w-9" />;
  }
  const isExpanded = row.getIsExpanded();

  return (
    <ExpandToggleButton
      isExpanded={isExpanded}
      onClick={row.getToggleExpandedHandler()}
      expandLabel="Expand row"
      collapseLabel="Collapse row"
      size={children ? 'default' : 'icon'}
      ariaExpanded={isExpanded}
    >
      {children}
    </ExpandToggleButton>
  );
}

export function RenderBytesCell(info: CellContext<TreeMapNode, unknown>) {
  const value = info.getValue();

  if (typeof value !== 'number') {
    return <div className="w-full text-right"> N/A</div>;
  }
  return <RenderBytesValue value={value} className="w-full text-right" />;
}

export function ExpandAll<T>({ table }: { table: ReactTable<T> }) {
  return (
    <ExpandToggleButton
      isExpanded={table.getIsAllRowsExpanded()}
      onClick={() => table.toggleAllRowsExpanded()}
      expandLabel="Expand all rows"
      collapseLabel="Collapse all rows"
    />
  );
}
