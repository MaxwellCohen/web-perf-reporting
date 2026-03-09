import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedUniqueValues,
  getFilteredRowModel,
  useReactTable,
  flexRender,
} from '@tanstack/react-table';
import { columns, makeSortingHeading } from '@/components/page-speed/JSUsage/jsUsageTableColumns';
import type { TreeMapNode } from '@/lib/schema';

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    'aria-label': ariaLabel,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    'aria-label'?: string;
  }) => (
    <button type="button" onClick={onClick} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}));

vi.mock('lucide-react', () => ({
  ArrowUp: () => <span data-testid="arrow-up" />,
  MinusIcon: () => <span data-testid="minus" />,
}));

vi.mock('@/components/page-speed/JSUsage/StringFilterHeader', () => ({
  StringFilterHeader: ({ name }: { name: string }) => <span data-testid="string-filter">{name}</span>,
}));

vi.mock('@/components/page-speed/JSUsage/jsUsageTableFilters', () => ({
  RangeFilter: () => <span data-testid="range-filter" />,
  numericRangeFilter: () => true,
}));

vi.mock('@/components/page-speed/JSUsage/jsUsageTableParts', () => ({
  ExpandRow: () => <span data-testid="expand-row" />,
  ExpandAll: () => <span data-testid="expand-all" />,
  RenderBytesCell: () => <span data-testid="bytes-cell" />,
}));

vi.mock('@/components/page-speed/JSUsage/StatusCircle', () => ({
  StatusCircle: () => <span data-testid="status-circle" />,
}));

vi.mock('@/components/page-speed/lh-categories/renderBoolean', () => ({
  renderBoolean: (v: boolean) => <span>{v ? 'Yes' : 'No'}</span>,
}));

vi.mock('@/components/page-speed/lh-categories/table/RenderTableValue', () => ({
  RenderBytesValue: ({ value }: { value: number }) => <span>{value} bytes</span>,
}));

const mockData: TreeMapNode[] = [
  {
    name: 'https://example.com/script.js',
    resourceBytes: 50000,
    unusedBytes: 10000,
  },
  {
    name: 'https://other.com/bundle.js',
    resourceBytes: 100000,
    unusedBytes: 50000,
  },
];

function TableWithNameHeader() {
  const table = useReactTable({
    data: mockData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    filterFns: { booleanFilterFn: () => true },
  });
  const headerGroup = table.getHeaderGroups()[0];
  const header = headerGroup.headers.find((h) => h.column.id === 'name');
  if (!header) return null;
  return <div>{flexRender(header.column.columnDef.header, header.getContext())}</div>;
}

function CellRenderer({
  data,
  columnId,
}: {
  data: TreeMapNode[];
  columnId: string;
}) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    filterFns: { booleanFilterFn: () => true },
  });
  const row = table.getRowModel().rows[0];
  const cell = row.getVisibleCells().find((c) => c.column.id === columnId);
  if (!cell?.column.columnDef.cell) return null;
  return (
    <table>
      <tbody>
        <tr>
          <td>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
        </tr>
      </tbody>
    </table>
  );
}

describe('jsUsageTableColumns', () => {
  describe('makeSortingHeading', () => {
    it('renders name and string filter', () => {
      const { container } = render(<TableWithNameHeader />);
      expect(container.textContent).toContain('Name');
      expect(container.querySelector('[data-testid="string-filter"]')).toBeTruthy();
    });

    it('sort button is clickable', () => {
      const { container } = render(<TableWithNameHeader />);
      const btn = container.querySelector('button[aria-label="Sort column Name"]');
      expect(btn).toBeTruthy();
      fireEvent.click(btn!);
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('columns', () => {
    it('renders name cell with URL host for array value', () => {
      const { container } = render(
        <CellRenderer
          data={[{ name: ['https://foo.com/bar.js'], resourceBytes: 0 } as unknown as TreeMapNode]}
          columnId="name"
        />,
      );
      expect(container.textContent).toContain('foo.com');
    });

    it('renders Unknown for invalid URL in array', () => {
      const { container } = render(
        <CellRenderer
          data={[{ name: ['not-a-url'], resourceBytes: 0 } as unknown as TreeMapNode]}
          columnId="name"
        />,
      );
      expect(container.textContent).toContain('Unknown');
    });

    it('renders Percent cell with N/A for undefined', () => {
      const { container } = render(
        <CellRenderer data={[{ name: 'x', resourceBytes: 0 } as TreeMapNode]} columnId="Percent" />,
      );
      expect(container.textContent).toContain('N/A');
    });

    it('renders Percent cell with value for valid numbers', () => {
      const { container } = render(
        <CellRenderer
          data={[{ name: 'x', resourceBytes: 100, unusedBytes: 25 } as TreeMapNode]}
          columnId="Percent"
        />,
      );
      expect(container.textContent).toMatch(/25\.00 %/);
    });
  });
});
