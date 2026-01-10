/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { RenderBytesValue } from '../lh-categories/table/RenderTableValue';
import { createBytesAggregatedCell, createStringAggregatedCell, createReportLabelAggregatedCell } from './aggregatedCellHelpers';

/**
 * Creates a standard URL column definition
 */
export function createURLColumn<T extends { url: string }>(
  columnHelper: ReturnType<typeof createColumnHelper<T>>,
  maxWidth: string = 'max-w-75',
): ColumnDef<T, any> {
  return columnHelper.accessor('url' as any, {
    id: 'url',
    header: 'URL',
    enableSorting: true,
    enableGrouping: true,
    enableResizing: true,
    filterFn: 'includesString',
    aggregationFn: 'unique',
    cell: (info) => (
      <div className={`${maxWidth} truncate`} title={info.getValue()}>
        {info.getValue()}
      </div>
    ),
    aggregatedCell: createStringAggregatedCell('url', undefined, false),
  });
}

/**
 * Creates a standard bytes column definition
 */
export function createBytesColumn<T>(
  columnHelper: ReturnType<typeof createColumnHelper<T>>,
  accessor: keyof T,
  header: string,
): ColumnDef<T, any> {
  return columnHelper.accessor(accessor as any, {
    id: String(accessor),
    header,
    enableSorting: true,
    enableResizing: true,
    filterFn: 'inNumberRange',
    aggregationFn: 'unique',
    cell: (info) => {
      const value = info.getValue() as number | undefined;
      return value !== undefined ? <RenderBytesValue value={value} /> : 'N/A';
    },
    aggregatedCell: createBytesAggregatedCell(String(accessor)),
  });
}

/**
 * Creates a standard report label column definition
 */
export function createReportColumn<T extends { label: string }>(
  columnHelper: ReturnType<typeof createColumnHelper<T>>,
): ColumnDef<T, any> {
  return columnHelper.accessor('label' as any, {
    id: 'label',
    header: 'Report',
    enableSorting: true,
    enableResizing: true,
    filterFn: 'includesString',
    aggregationFn: 'unique',
    aggregatedCell: createReportLabelAggregatedCell('label'),
  });
}

