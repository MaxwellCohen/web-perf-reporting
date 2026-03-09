import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { TableCard } from '@/components/page-speed/shared/TableCard';

vi.mock('@/components/page-speed/lh-categories/table/DataTableHeader', () => ({
  DataTableHeader: () => (
    <thead data-testid="data-table-header">
      <tr>
        <th>Col1</th>
      </tr>
    </thead>
  ),
}));

vi.mock('@/components/page-speed/lh-categories/table/DataTableBody', () => ({
  DataTableBody: () => (
    <tbody data-testid="data-table-body">
      <tr>
        <td>Row1</td>
      </tr>
    </tbody>
  ),
}));

vi.mock('@/components/page-speed/JSUsage/TableControls', () => ({
  PaginationCard: () => <div data-testid="pagination-card" />,
}));

function TableCardWithTable({
  rowCount,
  showPagination,
  pageSize = 10,
}: {
  rowCount: number;
  showPagination?: boolean;
  pageSize?: number;
}) {
  const columnHelper = createColumnHelper<{ id: string }>();
  const columns = [
    columnHelper.accessor('id', { header: 'ID' }),
  ];
  const data = Array.from({ length: rowCount }, (_, i) => ({ id: `row-${i}` }));
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    filterFns: { booleanFilterFn: () => true },
  });
  return (
    <TableCard
      title="Test Table"
      table={table}
      showPagination={showPagination}
      pageSize={pageSize}
    />
  );
}

describe('TableCard', () => {
  it('renders title and table', () => {
    const { container } = render(<TableCardWithTable rowCount={2} />);
    expect(container.textContent).toContain('Test Table');
    expect(container.querySelector('[data-testid="data-table-header"]')).toBeTruthy();
  });

  it('shows Show all results when rowCount > pageSize and showPagination', () => {
    const { container } = render(
      <TableCardWithTable rowCount={15} showPagination pageSize={10} />
    );
    const showAllBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Show all results')
    );
    expect(showAllBtn).toBeTruthy();
  });

  it('calls setPageSize when Show all results clicked', () => {
    const { container } = render(
      <TableCardWithTable rowCount={15} showPagination pageSize={10} />
    );
    const showAllBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Show all results')
    );
    fireEvent.click(showAllBtn!);
    const showLessBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Show less results')
    );
    expect(showLessBtn).toBeTruthy();
  });
});
