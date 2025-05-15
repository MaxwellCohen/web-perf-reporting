/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
'use no memo';
import { TreeMapData, TreeMapNode } from '@/lib/schema';
import {
  Table,
  TableBody,
  TableHeader,
  TableRow,
  TableCell,
  TableHead,
} from '@/components/ui/table';
import { RenderBytesValue } from '../lh-categories/table/RenderTableValue';
import {
  JSX,
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  CellContext,
  ColumnFiltersState,
  ExpandedState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  HeaderContext,
  PaginationState,
  Row,
  SortingState,
  useReactTable,
  VisibilityState,
  createColumnHelper,
  RowData,
  getGroupedRowModel,
  getExpandedRowModel,
  HeaderGroup,
  ColumnFiltersColumnDef,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
} from '@tanstack/react-table';
import { Button } from '../../ui/button';
import { cn } from '@/lib/utils';
import { renderBoolean } from '../lh-categories/renderBoolean';
import { StatusCircle } from './StatusCircle';
import { NoResultsRow } from './NoResultsRow';
import { TableControls } from './TableControls';
import { Label } from '@/components/ui/label';
import { DebouncedInput } from '@/components/ui/input';
import { Slider2 } from '@/components/ui/slider';
import { ArrowUp, ChevronRightIcon, MinusIcon } from 'lucide-react';
import { toTitleCase } from '../toTitleCase';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    className: string;
    // doNotShowInGroup?: boolean;
  }
}

export function ExpanderCell<T>({
  row,
  children,
}: Pick<Partial<CellContext<T, unknown>>, 'row'> & {
  children?: React.ReactNode;
}) {
  'use no memo';
  const isExpanded = row?.getIsExpanded();
  return (
    <>
      {row?.getCanExpand() || row?.getIsGrouped() ? (
        <Button
          variant={'ghost'}
          size={'icon'}
          onClick={row.getToggleExpandedHandler()}
          style={{ cursor: 'pointer' }}
        >
          {children}
          <ChevronRightIcon
            className={cn('transform transition-all duration-300', {
              'rotate-90': isExpanded,
            })}
          />
          <span className="sr-only">
            {isExpanded ? 'collapse row ' : 'expand row'}
          </span>
        </Button>
      ) : null}
    </>
  );
}

export function RenderBytesCell(info: CellContext<TreeMapNode, unknown>) {
  const value = info.getValue();
  return (
    <>
      {typeof value === 'number' ? (
        <RenderBytesValue value={value} className="w-full text-right" />
      ) : (
        <div className="w-full text-right"> N/A</div>
      )}
    </>
  );
}

export function makeSortingHeading(
  name: string,
  filterType?: 'string' | 'range',
) {
  return memo(function SortingHeader({
    column,
    // table,
  }: HeaderContext<TreeMapNode, unknown>) {
    'use no memo';
    return (
      <div className="flex h-full flex-col justify-between">
        <div className='my-2'>
          <Button
            variant="ghost"
            className={`px-0 w-auto text-left`}
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
          <StringFilterHeader column={column} name={name}/>
        ) : null}
        {filterType === 'range' ? <RangeFilter column={column} /> : null}
      </div>
    );
  });
}

export function StringFilterHeader<T>({
  column,
  name
}: Pick<HeaderContext<T, unknown>, 'column'> & {name: string}) {
  const id = useId();
  const uniqueValues = column.getFacetedUniqueValues();
  const sortedUniqueValues = useMemo(
    () => Array.from(uniqueValues.keys()).sort().slice(0, 5000),
    [uniqueValues],
  );

  const columnFilterValue = column.getFilterValue();

  return (
    <div className="flex flex-row my-2">
      <Label htmlFor={`filter_${id}`} className="sr-only">
        Filter
      </Label>
      <datalist id={column.id + 'list'}>
        {sortedUniqueValues.map((value: any) => (
          <option value={value} key={value} />
        ))}
      </datalist>
      <DebouncedInput
        type="text"
        value={(columnFilterValue ?? '') as string}
        onChange={(value) => column.setFilterValue(value)}
        placeholder={`Search... (${column.getFacetedUniqueValues().size})`}
        className="rounded border shadow"
        list={column.id + 'list'}
      />
      <Button
        variant="ghost"
        className="ml-2"
        onClick={() => {
          column?.setFilterValue('');
        }}
        aria-label={`Clear filter for ${name}`}
      >
        <span className="sr-only">Clear filter</span>
        <span aria-hidden="true">×</span>
      </Button>
    </div>
  );
}

function useDebouncedCallback(callback: (...arg: any[]) => any, delay = 100) {
  const timerIdRef = useRef<null | ReturnType<typeof setTimeout>>(null);
  const latestCallback = useRef(callback);

  // Update the latest callback ref whenever the provided callback changes
  useEffect(() => {
    latestCallback.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback(
    (...args: any[]) => {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
      }

      timerIdRef.current = setTimeout(() => {
        latestCallback.current(...args);
      }, delay);
    },
    [delay], // Only re-create debouncedCallback if delay changes
  );

  // Clean up the timer on unmount
  useEffect(() => {
    return () => {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

export function RangeFilter<T>({
  column,
}: Pick<HeaderContext<T, unknown>, 'column'>) {
  const id = useId();
  const [minValue, maxValue] = (column.getFacetedMinMaxValues() as [
    number,
    number,
  ]) ?? [0, 100];
  const [fMin, fMax] = (column.getFilterValue() as [number, number]) ?? [
    minValue,
    maxValue,
  ];
  const updateFilter = useDebouncedCallback((value: [number, number]) => {
    column.setFilterValue(value);
  }, 500);
  return (
    <div className="m-2 h-20">
      <div className="relative py-8">
        {/* Min thumb label */}
        <RenderBytesValue
          value={fMin}
          style={{ right: `60%` }}
          className={
            'absolute -top-8 inline-block translate-y-1/2 whitespace-nowrap text-xs font-medium'
          }
        >
          {'Min: '}
          <br />
        </RenderBytesValue>

        {/* Max thumb label */}
        <RenderBytesValue
          value={fMax}
           style={{ left: `60%` }}
          className={
            'break-none absolute top-8 translate-y-1/2 whitespace-nowrap text-right text-xs font-medium'
          }
        >
          {'Max: '}
          <br />
        </RenderBytesValue>

        <Slider2
          id={`range-slider_${id}`}
          defaultValue={[minValue, maxValue]}
          value={[fMin, fMax]}
          onValueChange={updateFilter}
          min={minValue}
          max={maxValue}
          className={cn('w-full')}
        />
      </div>
    </div>
  );
}

export const numericRangeFilter: ColumnFiltersColumnDef<TreeMapNode>['filterFn'] =
  (row, columnId, filterValue) => {
    const rowValue = row.getValue(columnId) as number;
    const [min, max] = filterValue; // filterValue will likely be an array [min, max]

    if (min !== undefined && rowValue < min) {
      return false;
    }

    if (max !== undefined && rowValue > max) {
      return false;
    }

    return true;
  };

const getHostName = (row: TreeMapNode) => {
  try {
    const url = new URL(row.name);
    return url.hostname;
  } catch {
    return 'Unknown';
  }
};

const columnHelper = createColumnHelper<TreeMapNode>();
const expanderColumn = columnHelper.display({
  id: 'expander',
  header: () => <div className=""></div>,
  cell: ExpanderCell,
  size: 56,
  meta: {
    className: '',
  },
});
const makeStatusColumn = (
  cell: (info: CellContext<TreeMapNode, unknown>) => JSX.Element,
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

const columns = [
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
      // doNotShowInGroup: true,
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
      sortingFn: 'alphanumeric', //disable resizing for just this column
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

export function useUseJSUsageTable(data: TreeMapData['nodes']) {
  'use no memo';
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    host: false,
  });
  const [rowSelection, setRowSelection] = useState({});
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [grouping, setGrouping] = useState(['host']);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const table = useReactTable({
    columns,
    data: data,
    onGroupingChange: setGrouping,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    enableSubRowSelection: true,
    getSubRows: (row) => (row.children?.length ? row.children : undefined),
    onPaginationChange: setPagination,
    onExpandedChange: setExpanded,
    getGroupedRowModel: getGroupedRowModel(),
    getFacetedRowModel: getFacetedRowModel(), // client-side faceting
    getFacetedUniqueValues: getFacetedUniqueValues(), // generate unique values for select filter/autocomplete
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    enableExpanding: true,
    filterFromLeafRows: true,
    maxLeafRowFilterDepth: 5,
    enableSorting: true,
    // rowCount: data.length,
    state: {
      columnPinning: {
        left: ['expander', 'Usage Status', 'name', 'host'],
      },
      pagination,
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      grouping,
      expanded: expanded,
    },
  });
  return table;
}

export function JSUsageTableWithControls({
  data,
  depth = 0,
}: {
  data: TreeMapData['nodes'];
  label?: string;
  depth?: number;
}) {
  'use no memo';
  const table = useUseJSUsageTable(data);
  const rows = table.getRowModel().rows;
  return (
    <>
      {depth === 0 ? <TableControls table={table} /> : null}
      <Table className="border-none">
        {/* {depth === 0 ? ( */}
        <TableHeader className="" suppressHydrationWarning>
          {table.getHeaderGroups().map((headerGroup, i) => (
            <JSUsageTableHeader
              key={`${headerGroup.id}_${i}_${depth}`}
              headerGroup={headerGroup}
              depth={depth}
              i={i}
            />
          ))}
        </TableHeader>
        {/* ) : null} */}
        <TableBody className="flex flex-col border-0" suppressHydrationWarning>
          {rows?.length ? (
            rows.map((row, i) => (
              <JSUsageTableRow
                key={`${row.id}_${i}_${depth}`}
                row={row}
                i={i}
              />
            ))
          ) : (
            <NoResultsRow />
          )}
        </TableBody>
      </Table>
    </>
  );
}
export function JSUsageTableHeader({
  headerGroup,
  depth,
  i,
}: {
  headerGroup: HeaderGroup<TreeMapNode>;
  depth: number;
  i: number;
}) {
  'use no memo';

  return (
    <TableRow
      key={`${headerGroup.id}_${i}_${depth}`}
      className={cn('flex h-auto w-full overflow-hidden px-0 py-0', {
        'border-2': true,
        'border-l-0': true,
        'self-end': depth !== 0,
      })}
      style={{
        // @ts-expect-error ts is weird
        '--depthOffset': `${depth * 2.25}rem`,
      }}
    >
      {headerGroup.headers.map((header) => {
        return (
          <TableHead
            key={`${header.id}_${i}_${depth}`}
            className={cn(
              'border-none',
              `${header.column.columnDef.meta?.className || ''}`,
            )}
            style={
              typeof header.column.getSize() === 'number'
                ? {
                    width: header.column.getSize() + 'px',
                  }
                : undefined
            }
          >
            {flexRender(header.column.columnDef.header, header.getContext())}
          </TableHead>
        );
      })}
    </TableRow>
  );
}

function JSUsageTableRow({ row, i }: { row: Row<TreeMapNode>; i: number }) {
  'use no memo';
  const isExpanded = row.getIsExpanded();
  const depth = row.depth + (isExpanded ? 1 : 0); //providedDepth + (row.parentId ? 1 : 0);
  const subRows = row?.getParentRow()?.subRows || [];
  return (
    <>
      <TableRow
        data-children={row?.original?.children?.length || 0}
        className={cn(
          'w-[calc(100% - 4px)] flex overflow-hidden border-muted',
          {
            // 'border-t-[length:--depth]':
            //   depth && row.index === 0,
            'border-b-[length:--depth]':
              depth && row.index + 1 === (subRows.length || 0),
            'border-r-[length:--depth]': depth,
            'border-r-[length:--depth] border-t-[length:--depth]': isExpanded,
            'border-b-[length:--depth] border-muted':
              (depth || isExpanded) &&
              subRows.findIndex((a) => a == row) === subRows.length - 1,
          },
        )}
        style={{
          // @ts-expect-error ts is weird
          '--depth': `${5 * depth}px`,
        }}
        suppressHydrationWarning
      >
        {row
          .getVisibleCells()
          .map((cell, index) => {
            const cellContent = flexRender(
              cell.column.columnDef.cell,
              cell.getContext(),
            );
            return (
              <TableCell
                key={`${cell.id}_${i}_${depth}`}
                data-key={`${cell.id}_${i}_${depth}`}
                className={cn(
                  `flex flex-row`,
                  {
                    'border-l-[length:--depth] border-muted':
                      (depth || isExpanded) && !index,
                  },
                  `${cell.column.columnDef.meta?.className || ''}`,
                )}
                style={
                  typeof cell.column.getSize() === 'number'
                    ? {
                        width: `${cell.column.getSize()}px`,
                      }
                    : undefined
                }
                suppressHydrationWarning
              >
                {cellContent}
              </TableCell>
            );
          })
          .filter(Boolean)}
      </TableRow>
    </>
  );
}