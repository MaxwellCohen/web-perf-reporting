import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createColumnHelper } from '@tanstack/react-table';
import { useTableColumns } from './useTableColumns';

type Row = { id: string; label: string };

describe('useTableColumns', () => {
  it('returns base columns when showReportColumn is false', () => {
    const helper = createColumnHelper<Row>();
    const baseCols = [helper.accessor('id', { header: 'ID' })];
    const { result } = renderHook(() =>
      useTableColumns(baseCols, helper, false)
    );
    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toBe(baseCols[0]);
  });

  it('appends report column when showReportColumn is true', () => {
    const helper = createColumnHelper<Row>();
    const baseCols = [helper.accessor('id', { header: 'ID' })];
    const { result } = renderHook(() =>
      useTableColumns(baseCols, helper, true)
    );
    expect(result.current).toHaveLength(2);
    expect(result.current[0]).toBe(baseCols[0]);
    expect(result.current[1]).toMatchObject({ id: 'label', header: 'Report' });
  });
});
