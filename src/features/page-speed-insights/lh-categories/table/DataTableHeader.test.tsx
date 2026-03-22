import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { DataTableHeader } from '@/features/page-speed-insights/lh-categories/table/DataTableHeader';

vi.mock('@/features/page-speed-insights/lh-categories/table/sortingButton', () => ({
  SortingButton: () => <span data-testid="sorting-button" />,
}));

vi.mock('@/features/page-speed-insights/JSUsage/JSUsageTable', () => ({
  RangeFilter: () => null,
  StringFilterHeader: () => null,
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
    asChild ? <>{children}</> : <div>{children}</div>,
}));

vi.mock('lucide-react', () => ({
  ListFilter: () => <span data-testid="list-filter" />,
}));

vi.mock('@/features/page-speed-insights/lh-categories/table/columnResizer', () => ({
  ColumnResizer: () => null,
}));

function TableWithHeader() {
  const columnHelper = createColumnHelper<{ id: string; name: string }>();
  const columns = [
    columnHelper.accessor('id', { id: 'id', header: 'ID' }),
    columnHelper.accessor('name', { id: 'name', header: 'Name' }),
  ];
  const data = [{ id: '1', name: 'Test' }];
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    filterFns: { booleanFilterFn: () => true },
  });
  return (
    <table>
      <DataTableHeader table={table} />
    </table>
  );
}

describe('DataTableHeader', () => {
  it('renders table header with column headers', () => {
    const { container } = render(<TableWithHeader />);
    expect(container.querySelector('thead')).toBeTruthy();
    expect(container.textContent).toContain('ID');
    expect(container.textContent).toContain('Name');
  });
});
