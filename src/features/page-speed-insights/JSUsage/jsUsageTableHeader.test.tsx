import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { createColumnHelper } from '@tanstack/react-table';
import { JSUsageTableHeader } from '@/features/page-speed-insights/JSUsage/jsUsageTableHeader';
import type { TreeMapNode } from '@/lib/schema';

vi.mock('@/components/ui/table', () => ({
  TableRow: ({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
    <tr className={className} style={style}>{children}</tr>
  ),
  TableHead: ({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
    <th className={className} style={style}>{children}</th>
  ),
}));

const columnHelper = createColumnHelper<TreeMapNode>();
const columns = [
  columnHelper.accessor('name', { id: 'name', header: 'Name' }),
  columnHelper.accessor('resourceBytes', { id: 'resourceBytes', header: 'Size' }),
];

function TableWithHeader() {
  const table = useReactTable({
    data: [{ name: 'https://a.com/x.js', resourceBytes: 1000 }],
    columns,
    getCoreRowModel: getCoreRowModel(),
    filterFns: { booleanFilterFn: () => true },
  });
  const headerGroup = table.getHeaderGroups()[0];
  return (
    <table>
      <thead>
        <JSUsageTableHeader headerGroup={headerGroup} depth={0} i={0} />
      </thead>
    </table>
  );
}

describe('JSUsageTableHeader', () => {
  it('renders header row with column headers', () => {
    const { container } = render(<TableWithHeader />);
    expect(container.querySelector('tr')).toBeTruthy();
    expect(container.textContent).toContain('Name');
    expect(container.textContent).toContain('Size');
  });

  it('applies depth offset via style', () => {
    const { container } = render(<TableWithHeader />);
    const row = container.querySelector('tr');
    expect(row).toBeTruthy();
    const style = row?.getAttribute('style') ?? '';
    expect(style).toContain('--depthOffset');
  });

  it('applies self-end class when depth !== 0', () => {
    function HeaderWithDepth() {
      const table = useReactTable({
        data: [{ name: 'x', resourceBytes: 0 }],
        columns,
        getCoreRowModel: getCoreRowModel(),
        filterFns: { booleanFilterFn: () => true },
      });
      const headerGroup = table.getHeaderGroups()[0];
      return (
        <table>
          <thead>
            <JSUsageTableHeader headerGroup={headerGroup} depth={1} i={0} />
          </thead>
        </table>
      );
    }
    const { container } = render(<HeaderWithDepth />);
    const row = container.querySelector('tr');
    expect(row?.className).toContain('self-end');
  });
});
