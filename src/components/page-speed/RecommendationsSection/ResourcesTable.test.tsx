import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResourcesTable } from '@/components/page-speed/RecommendationsSection/ResourcesTable';

type MockCell = { column: { id: string; columnDef: { cell?: (ctx: unknown) => React.ReactNode } }; getContext: () => unknown };
type MockRow = { id: string; getVisibleCells: () => MockCell[] };
type MockTable = { getRowModel: () => { rows: MockRow[] } };

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
}));

vi.mock('@/components/page-speed/lh-categories/table/DataTableHeader', () => ({
  DataTableHeader: ({ table }: { table: { getHeaderGroups: () => unknown[] } }) => (
    <thead data-testid="table-header">
      {table.getHeaderGroups().map(() => (
        <tr key="h"><th>Header</th></tr>
      ))}
    </thead>
  ),
}));

vi.mock('@/components/page-speed/lh-categories/table/DataTableBody', () => ({
  DataTableBody: ({ table }: { table: MockTable }) => (
    <tbody data-testid="table-body">
      {table.getRowModel().rows.map((row: MockRow) => {
        const cells = row.getVisibleCells();
        return (
          <tr key={row.id}>
            {cells.map((cell: MockCell) => (
              <td key={cell.column.id}>
                {typeof cell.column.columnDef.cell === 'function'
                  ? cell.column.columnDef.cell(cell.getContext())
                  : null}
              </td>
            ))}
          </tr>
        );
      })}
    </tbody>
  ),
}));

vi.mock('@/components/page-speed/lh-categories/table/RenderTableValue', () => ({
  RenderBytesValue: ({ value }: { value: number }) => <span>{value} B</span>,
  RenderMSValue: ({ value }: { value: number }) => <span>{value} ms</span>,
}));

describe('ResourcesTable', () => {
  it('renders table with items', () => {
    const items = [
      { url: 'https://example.com/style.css', wastedBytes: 5000, wastedMs: 100 },
    ];
    const { container } = render(<ResourcesTable items={items} />);
    expect(container.querySelector('table')).toBeTruthy();
    expect(container.querySelector('[data-testid="table-header"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="table-body"]')).toBeTruthy();
  });

  it('renders link for valid url', () => {
    const items = [{ url: 'https://example.com/script.js' }];
    const { container } = render(<ResourcesTable items={items} />);
    const link = container.querySelector('a[href="https://example.com/script.js"]');
    expect(link).toBeTruthy();
  });

  it('renders Unattributable for url without host', () => {
    const items = [{ url: 'Unattributable' }];
    const { container } = render(<ResourcesTable items={items} />);
    expect(container.textContent).toContain('Unattributable');
  });

  it('renders empty table when no items', () => {
    const { container } = render(<ResourcesTable items={[]} />);
    expect(container.querySelector('table')).toBeTruthy();
  });
});
