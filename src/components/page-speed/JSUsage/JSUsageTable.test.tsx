import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  numericRangeFilter,
  ExpandRow,
  RenderBytesCell,
  ExpandAll,
  useUseJSUsageTable,
  JSUsageTableWithControls,
} from '@/components/page-speed/JSUsage/JSUsageTable';
import type { FilterFn } from '@tanstack/react-table';
import type { Row } from '@tanstack/react-table';

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
}));

vi.mock('@/components/page-speed/JSUsage/TableControls', () => ({
  TableControls: () => <div data-testid="table-controls">TableControls</div>,
}));

vi.mock('lucide-react', () => ({
  ArrowUp: () => <span data-testid="arrow-up" />,
  MinusIcon: () => <span data-testid="minus" />,
  ChevronRightIcon: () => <span data-testid="chevron-right" />,
  ChevronDown: () => <span data-testid="chevron-down" />,
  ChevronUp: () => <span data-testid="chevron-up" />,
}));

vi.mock('@/components/page-speed/lh-categories/table/RenderTableValue', () => ({
  RenderBytesValue: ({ value }: { value: number }) => (
    <span data-testid="bytes">{value} bytes</span>
  ),
}));

const noopAddMeta = () => {};

const mockTreeNodes = [
  {
    name: 'https://example.com/script.js',
    resourceBytes: 50000,
    unusedBytes: 10000,
    children: [] as { name: string; resourceBytes: number; unusedBytes?: number }[],
  },
];

function JSUsageTableWrapper({ data }: { data: typeof mockTreeNodes }) {
  const table = useUseJSUsageTable(data);
  return <div data-testid="table">{table.getRowModel().rows.length} rows</div>;
}

describe('JSUsageTable', () => {
  describe('numericRangeFilter', () => {
    const getRow = (value: number) =>
      ({ getValue: () => value }) as unknown as Row<{ x: number }>;
    const filter = numericRangeFilter as unknown as FilterFn<{ x: number }>;

    it('returns true when value is within [min, max]', () => {
      expect(filter(getRow(50), 'x', [0, 100], noopAddMeta)).toBe(true);
      expect(filter(getRow(0), 'x', [0, 100], noopAddMeta)).toBe(true);
      expect(filter(getRow(100), 'x', [0, 100], noopAddMeta)).toBe(true);
    });

    it('returns false when value is below min', () => {
      expect(filter(getRow(10), 'x', [20, 100], noopAddMeta)).toBe(false);
    });

    it('returns false when value is above max', () => {
      expect(filter(getRow(150), 'x', [0, 100], noopAddMeta)).toBe(false);
    });

    it('handles undefined min (only max check)', () => {
      expect(filter(getRow(50), 'x', [undefined, 100], noopAddMeta)).toBe(true);
      expect(filter(getRow(150), 'x', [undefined, 100], noopAddMeta)).toBe(false);
    });

    it('handles undefined max (only min check)', () => {
      expect(filter(getRow(50), 'x', [0, undefined], noopAddMeta)).toBe(true);
      expect(filter(getRow(0), 'x', [10, undefined], noopAddMeta)).toBe(false);
    });
  });

  describe('ExpandAll', () => {
    function ExpandAllWrapper() {
      const table = useUseJSUsageTable(mockTreeNodes);
      return <ExpandAll table={table} />;
    }
    it('renders expand/collapse button', () => {
      const { container } = render(<ExpandAllWrapper />);
      expect(container.querySelector('button')).toBeTruthy();
      expect(container.querySelector('button')?.getAttribute('aria-label')).toMatch(/Expand all|Collapse all/);
    });
  });

  describe('ExpandRow', () => {
    it('renders placeholder when row is missing', () => {
      const { container } = render(<ExpandRow />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('renders placeholder when row cannot expand', () => {
      const row = {
        getIsExpanded: () => false,
        getCanExpand: () => false,
        getToggleExpandedHandler: () => () => {},
      };
      const { container } = render(<ExpandRow row={row as any} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('renders expand button when row can expand', () => {
      const row = {
        getIsExpanded: () => false,
        getCanExpand: () => true,
        getToggleExpandedHandler: () => () => {},
      };
      const { container } = render(<ExpandRow row={row as any} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('renders collapse label when expanded', () => {
      const row = {
        getIsExpanded: () => true,
        getCanExpand: () => true,
        getToggleExpandedHandler: () => () => {},
      };
      const { container } = render(<ExpandRow row={row as any} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('RenderBytesCell', () => {
    it('renders N/A for non-number value', () => {
      const { container } = render(
        <table>
          <tbody>
            <tr>
              <td>
                {RenderBytesCell({
                  getValue: () => 'n/a',
                  row: {} as any,
                  column: {} as any,
                  table: {} as any,
                  renderValue: () => 'n/a',
                } as any)}
              </td>
            </tr>
          </tbody>
        </table>,
      );
      expect(container.textContent).toContain('N/A');
    });

    it('renders bytes value for number', () => {
      const { container } = render(
        <table>
          <tbody>
            <tr>
              <td>
                {RenderBytesCell({
                  getValue: () => 1024,
                  row: {} as any,
                  column: {} as any,
                  table: {} as any,
                  renderValue: () => 1024,
                } as any)}
              </td>
            </tr>
          </tbody>
        </table>,
      );
      expect(container.textContent).toMatch(/1024 bytes/);
    });
  });

  describe('useUseJSUsageTable', () => {
    it('returns table with rows from data', () => {
      const { container } = render(<JSUsageTableWrapper data={mockTreeNodes} />);
      expect(container.querySelector('[data-testid="table"]')?.textContent).toBe('1 rows');
    });

    it('returns table with 0 rows for empty data', () => {
      const { container } = render(<JSUsageTableWrapper data={[]} />);
      expect(container.querySelector('[data-testid="table"]')?.textContent).toBe('0 rows');
    });
  });

  describe('JSUsageTableWithControls', () => {
    it('renders table with rows when data provided', () => {
      const { container } = render(<JSUsageTableWithControls data={mockTreeNodes} />);
      expect(container.querySelector('table')).toBeTruthy();
      expect(container.textContent).not.toContain('No results.');
    });

    it('renders NoResultsRow when data is empty', () => {
      const { container } = render(<JSUsageTableWithControls data={[]} />);
      expect(container.textContent).toContain('No results.');
    });

    it('renders TableControls when depth is 0', () => {
      const { container } = render(<JSUsageTableWithControls data={mockTreeNodes} />);
      expect(container.querySelector('[data-testid="table-controls"]')).toBeTruthy();
    });

    it('renders without TableControls when depth > 0', () => {
      const { container } = render(<JSUsageTableWithControls data={mockTreeNodes} depth={1} />);
      expect(container.querySelector('[data-testid="table-controls"]')).toBeNull();
    });
  });
});
