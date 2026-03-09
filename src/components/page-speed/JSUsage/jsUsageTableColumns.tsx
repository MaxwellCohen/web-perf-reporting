/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { memo } from 'react';
import type { CellContext, HeaderContext } from '@tanstack/react-table';
import { createColumnHelper } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { ArrowUp, MinusIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { renderBoolean } from '@/components/page-speed/lh-categories/renderBoolean';
import { StatusCircle } from '@/components/page-speed/JSUsage/StatusCircle';
import { toTitleCase } from '@/components/page-speed/toTitleCase';
import type { TreeMapNode } from '@/lib/schema';
import type { RowData } from '@tanstack/react-table';
import { StringFilterHeader } from './StringFilterHeader';
import { RangeFilter, numericRangeFilter } from './jsUsageTableFilters';
import { ExpandRow, ExpandAll, RenderBytesCell } from './jsUsageTableParts';
import { getHostnameFromUrl } from '@/lib/urlDisplay';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string;
  }
}

const getHostName = (row: TreeMapNode) => getHostnameFromUrl(row.name);

const columnHelper = createColumnHelper<TreeMapNode>();

export function makeSortingHeading(
  name: string,
  filterType?: 'string' | 'range',
) {
  return memo(function SortingHeader({
    column,
  }: HeaderContext<TreeMapNode, unknown>) {
    'use no memo';
    return (
      <div className="flex h-full flex-col justify-between">
        <div className="my-2">
          <Button
            variant="ghost"
            className="px-0 w-auto text-left"
            onClick={() => {
              column.toggleSorting(column.getIsSorted() === 'asc');
            }}
            aria-label={`Sort column ${name}`}
          >
            <div className="">{name}</div>
            {column.getIsSorted() ? (
              <ArrowUp
                className={cn('transform transition-all duration-300', {
                  'rotate-180': column.getIsSorted() !== 'asc',
                })}
              />
            ) : (
              <MinusIcon />
            )}
          </Button>
        </div>
        {filterType === 'string' ? (
          <StringFilterHeader column={column} name={name} />
        ) : null}
        {filterType === 'range' ? <RangeFilter column={column} /> : null}
      </div>
    );
  });
}

const expanderColumn = columnHelper.display({
  id: 'expander',
  header: ExpandAll,
  cell: ExpandRow,
  size: 40,
  meta: {
    className: '',
  },
});

const makeStatusColumn = (
  cell: (info: CellContext<TreeMapNode, unknown>) => React.JSX.Element,
) =>
  columnHelper.display({
    id: 'statusColumn',
    header: () => <></>,
    enableGrouping: true,
    size: 36,
    cell,
    meta: {
      className: 'grid place-content-center',
    },
  });

const makeSortableStringColumn = (column: string) => {
  // @ts-expect-error: Im lazy to do full inference
  return columnHelper.accessor(column, {
    getGroupingValue: (row) => getHostName(row),
    meta: {
      className: 'overflow-scroll-x h-auto',
    },
    size: 700,
    header: makeSortingHeading(toTitleCase(column), 'string'),
    aggregationFn: 'unique',
    enableSorting: true,
    cell: (info) => {
      let value = info.getValue();
      if (Array.isArray(value)) {
        try {
          value = new URL(value[0] as string).host;
        } catch {
          value = 'Unknown';
        }
      }
      return (
        <div className="overflow-hidden">
          <div className="flex flex-row overflow-x-auto">{value as string}</div>
        </div>
      );
    },
  });
};

const makeBooleanColumn = (column: string, extra = {}) => {
  // @ts-expect-error: Im lazy to do full inference
  return columnHelper.accessor(column, {
    size: 140,
    meta: {
      className: 'place-content-center my-2',
    },
    cell: function checkboxItem(info) {
      return <>{renderBoolean(!!info.getValue())}</>;
    },
    ...extra,
  });
};

const makeBytesColumn = (column: string, title: string, extra = {}) => {
  // @ts-expect-error: Im lazy to do full inference
  return columnHelper.accessor(column, {
    cell: RenderBytesCell,
    sortingFn: 'basic',
    enableSorting: true,
    sortUndefined: 'last',
    header: makeSortingHeading(title, 'range'),
    enableHiding: true,
    filterFn: numericRangeFilter,
    aggregationFn: 'sum',
    size: 140,
    meta: {
      className: 'h-auto text',
    },
    ...extra,
  });
};

export const columns = [
  expanderColumn,
  makeStatusColumn((info) => <StatusCircle node={info?.row?.original} />),
  makeSortableStringColumn('name'),
  columnHelper.accessor(getHostName, {
    id: 'host',
    size: 300,
    enableHiding: true,
    enablePinning: true,
    enableGrouping: true,
    enableMultiSort: true,
    enableSorting: true,
    sortingFn: 'basic',
    header: () => makeSortingHeading('Host'),
    meta: {
      className: '',
    },
  }),
  makeBooleanColumn('duplicatedNormalizedModuleName', {
    id: 'Duplicated Module',
    header: 'Duplicated Module',
  }),
  makeBytesColumn('resourceBytes', 'Resource Size'),
  makeBytesColumn('unusedBytes', 'Unused Bytes'),

  columnHelper.accessor(
    ({ resourceBytes, unusedBytes }) => {
      if (
        typeof resourceBytes !== 'number' ||
        typeof unusedBytes !== 'number'
      ) {
        return undefined;
      }
      const percent = (unusedBytes / resourceBytes) * 100;
      return percent;
    },
    {
      id: 'Percent',
      cell: (info) => {
        const value = info.getValue();
        return (
          <div className="w-36 text-right">
            {typeof value === 'number'
              ? `${value.toFixed(2)} %`
              : value === ''
                ? ''
                : 'N/A'}
          </div>
        );
      },
      sortingFn: 'alphanumeric',
      sortUndefined: 'last',
      meta: {
        className: '',
      },
      aggregationFn: () => '',
      aggregatedCell: () => <> </>,
      enableSorting: true,
      enableHiding: true,
      size: 140,
      header: makeSortingHeading('Percent'),
    },
  ),
];
