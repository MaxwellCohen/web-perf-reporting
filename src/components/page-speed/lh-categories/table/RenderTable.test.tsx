import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Accordion } from '@/components/ui/accordion';
import { DetailTable, makeColumnDef, simpleTableCell } from '@/components/page-speed/lh-categories/table/RenderTable';
import type { CellContext } from '@tanstack/react-table';

vi.mock('@/components/page-speed/lh-categories/table/RenderTableValue', () => ({
  RenderTableValue: ({ value }: { value: unknown }) => (
    <span data-testid="table-value">{String(value)}</span>
  ),
}));

vi.mock('@/components/page-speed/lh-categories/table/DataTableHeader', () => ({
  DataTableHeader: () => <thead data-testid="data-table-header" />,
}));

vi.mock('@/components/page-speed/lh-categories/table/DataTableBody', () => ({
  DataTableBody: () => <tbody data-testid="data-table-body" />,
}));

vi.mock('@/components/page-speed/JSUsage/JSUsageTable', () => ({
  ExpandAll: () => <span data-testid="expand-all" />,
  ExpandRow: () => <span data-testid="expand-row" />,
}));

const createMockRow = (overrides = {}) => ({
  _userLabel: 'Mobile',
  auditResult: {
    id: 'test-audit',
    details: {
      type: 'table',
      headings: [{ key: 'name', valueType: 'text', label: 'Name' }],
      items: [{ name: 'Item 1' }],
    },
  },
  ...overrides,
});

describe('DetailTable', () => {
  it('returns null when rows have no detail items', () => {
    const rows = [
      createMockRow({
        auditResult: {
          id: 'empty',
          details: { type: 'table', headings: [], items: [] },
        },
      }),
    ];
    const { container } = render(<DetailTable rows={rows as any} title="Test" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders table when rows have detail items', () => {
    const rows = [createMockRow()];
    const { container } = render(
      <Accordion type="single" collapsible>
        <DetailTable rows={rows as any} title="Test Table" />
      </Accordion>
    );
    // DetailTable renders AccordionItem with table inside - table may be in collapsed content
    expect(container.textContent).toContain('Test Table');
  });
});

describe('makeColumnDef', () => {
  it('returns column definitions for heading', () => {
    const defs = makeColumnDef(
      {
        heading: { key: 'size', valueType: 'bytes', label: 'Size' },
        _userLabel: '',
      },
      { showUserLabel: false }
    );
    expect(defs.length).toBeGreaterThan(0);
    expect(defs[0].id).toContain('size');
  });

  it('returns empty array for heading without key', () => {
    const defs = makeColumnDef(
      { heading: { key: '', label: '', valueType: 'text' }, _userLabel: '' },
      { showUserLabel: false }
    );
    expect(defs).toEqual([]);
  });
});

describe('simpleTableCell', () => {
  it('renders value via RenderTableValue for non-array', () => {
    const mockCell = {
      getValue: () => 'test',
      column: { columnDef: { meta: { heading: { heading: { valueType: 'text' } } } } },
      row: { original: { _userLabel: '' } },
    } as unknown as CellContext<any, unknown>;
    const result = simpleTableCell(mockCell);
    expect(result).toBeTruthy();
  });
});
