/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';
import { ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { createReportColumn } from '@/components/page-speed/shared/tableColumnHelpers';

/**
 * Hook to conditionally add a report column to table columns based on showReportColumn flag.
 * Follows the pattern used in BootupTimeCard where base columns are defined separately
 * and the report column is conditionally added.
 * 
 * @param baseColumns - The base column definitions
 * @param columnHelper - The column helper instance for the table row type
 * @param showReportColumn - Whether to include the report column
 * @returns Memoized column definitions with report column conditionally added
 */
export function useTableColumns<T extends { label: string }>(
  baseColumns: ColumnDef<T, any>[],
  columnHelper: ReturnType<typeof createColumnHelper<T>>,
  showReportColumn: boolean,
): ColumnDef<T, any>[] {
  return useMemo(() => {
    if (showReportColumn) {
      return [...baseColumns, createReportColumn(columnHelper)];
    }
    return baseColumns;
  }, [baseColumns, columnHelper, showReportColumn]);
}

