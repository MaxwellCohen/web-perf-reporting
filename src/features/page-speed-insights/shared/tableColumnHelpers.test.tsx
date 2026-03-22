import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createColumnHelper } from '@tanstack/react-table';
import {
  createBytesColumn,
  createReportColumn,
  createURLColumn,
} from '@/features/page-speed-insights/shared/tableColumnHelpers';

vi.mock('@/features/page-speed-insights/lh-categories/table/RenderTableValue', () => ({
  RenderBytesValue: ({ value }: { value: number }) => <span>{value} B</span>,
}));

vi.mock('@/features/page-speed-insights/shared/aggregatedCellHelpers', () => ({
  createBytesAggregatedCell: () => () => null,
  createStringAggregatedCell: () => () => null,
  createReportLabelAggregatedCell: () => () => null,
}));

type Row = { url: string; label: string; bytes?: number };

describe('tableColumnHelpers', () => {
  describe('createURLColumn', () => {
    it('returns column with url accessor and header', () => {
      const helper = createColumnHelper<Row>();
      const col = createURLColumn(helper);
      expect(col.id).toBe('url');
      expect(col.header).toBe('URL');
    });

    it('uses custom maxWidth when provided', () => {
      const helper = createColumnHelper<Row>();
      const col = createURLColumn(helper, 'max-w-50');
      const cell = (col.cell as Function)({
        getValue: () => 'https://example.com',
      } as any);
      const { container } = render(<>{cell}</>);
      expect(container.firstChild).toHaveClass('max-w-50');
    });
  });

  describe('createBytesColumn', () => {
    it('returns column with accessor and header', () => {
      const helper = createColumnHelper<Row>();
      const col = createBytesColumn(helper, 'bytes', 'Bytes');
      expect(col.id).toBe('bytes');
      expect(col.header).toBe('Bytes');
    });

    it('renders N/A when value is undefined', () => {
      const helper = createColumnHelper<Row>();
      const col = createBytesColumn(helper, 'bytes', 'Bytes');
      const cell = (col.cell as Function)({ getValue: () => undefined } as any);
      expect(cell).toBe('N/A');
    });

    it('renders RenderBytesValue when value is defined', () => {
      const helper = createColumnHelper<Row>();
      const col = createBytesColumn(helper, 'bytes', 'Bytes');
      const cell = (col.cell as Function)({ getValue: () => 1024 } as any);
      const { container } = render(<>{cell}</>);
      expect(container.textContent).toContain('1024');
    });
  });

  describe('createReportColumn', () => {
    it('returns column with label accessor', () => {
      const helper = createColumnHelper<Row>();
      const col = createReportColumn(helper);
      expect(col.id).toBe('label');
      expect(col.header).toBe('Report');
    });
  });
});
