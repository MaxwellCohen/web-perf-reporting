import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DebugData } from '@/lib/schema';
import { renderBoolean } from '@/components/page-speed/lh-categories/renderBoolean';
import { camelCaseToSentenceCase } from '@/components/page-speed/lh-categories/camelCaseToSentenceCase';
import { TableDataItem } from '@/components/page-speed/tsTable/TableDataItem';
import { useMemo } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getGroupedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  RenderBytesValue,
  RenderCountNumber,
  renderTimeValue,
} from '@/components/page-speed/lh-categories/table/RenderTableValue';

type DebugDataTableItem = {
  key: string;
  value: unknown;
  label: string;
};

const columnHelper = createColumnHelper<DebugDataTableItem>();

export function RenderDebugData({ items }: { items: TableDataItem[] }) {
  const data = useMemo(
    () =>
      items?.reduce((acc: Array<DebugDataTableItem>, i) => {
        const d = Object.entries(
          cleanDebugData(i.auditResult.details as DebugData),
        ).map((i2) => {
          return {
            key: i2[0],
            value: i2[1],
            label: i._userLabel,
          };
        });
        return [...acc, ...d];
      }, []),
    [items],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('key', {
        id: 'key',
        enableGrouping: true,
        header: 'Item',
        cell: (props) => {
          const val = props.getValue();
          return RenderTitle(val);
        },
        aggregationFn: 'unique',
      }),
      columnHelper.accessor('value', {
        header: 'Value',
        aggregationFn: 'unique', // unique values for each column
        cell: (props) => {
          const val = props.getValue();
          const key = props.row.getValue('key') as string;
          return renderItem(val, key);
        },
      }),
      columnHelper.accessor('label', {
        enableGrouping: true,
      }),
    ],
    [],
  );
  const table = useReactTable<DebugDataTableItem>({
    // core items
    data, // in the form of an  array

    columns, // column definitions
    getCoreRowModel: getCoreRowModel(), // basic layout

    // grouping
    manualPagination: true, // prevents ssr issues with grouping in Next js

    getGroupedRowModel: getGroupedRowModel(), // enable grouping
    getExpandedRowModel: getExpandedRowModel(),

    // column pinning
    enableColumnPinning: true,
    filterFns: {
      booleanFilterFn: (row, columnId, filterValue) => {
        const rowValue = row.getValue(columnId);
        return rowValue === filterValue;
      },
    },
    state: {
      // expanded: true,
      grouping: ['key'],
      columnPinning: {
        left: ['key', 'value', 'label'],
      },
    },
  });

  console.log('table', table);

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => {
          return (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          );
        })}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => {
          if (row.subRows.length) {
            return row.subRows
              .map((sr, i) => {
                return (
                  <TableRow key={sr.id}>
                    {sr.getVisibleCells().map((cell) => {
                      if (cell.id.includes('key')) {
                        if (i !== 0) {
                          return null;
                        }
                        return (
                          <TableCell
                            key={cell.id}
                            rowSpan={row.subRows.length}
                            data-cell-id={cell.id}
                            data-column-id={cell.column.id}
                            data-can-expand={`${sr.getCanExpand()}`}
                            data-depth={sr.depth}
                            data-row-expanded={`${sr.getIsExpanded()}`}
                            data-grouped={`${cell.getIsGrouped()}`}
                            data-aggregated={`${cell.getIsAggregated()}`}
                            data-placeholder={`${cell.getIsPlaceholder()}`}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        );
                      }
                      return (
                        <TableCell
                          key={cell.id}
                          rowSpan={1}
                          data-cell-id={cell.id}
                          data-column-id={cell.column.id}
                          data-can-expand={`${sr.getCanExpand()}`}
                          data-depth={sr.depth}
                          data-row-expanded={`${sr.getIsExpanded()}`}
                          data-grouped={`${cell.getIsGrouped()}`}
                          data-aggregated={`${cell.getIsAggregated()}`}
                          data-placeholder={`${cell.getIsPlaceholder()}`}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
              .filter(Boolean);
          }
          return (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => {
                return (
                  <TableCell
                    key={cell.id}
                    data-cell-id={cell.id}
                    data-column-id={cell.column.id}
                    data-can-expand={`${row.getCanExpand()}`}
                    data-depth={row.depth}
                    data-row-expanded={`${row.getIsExpanded()}`}
                    data-grouped={`${cell.getIsGrouped()}`}
                    data-aggregated={`${cell.getIsAggregated()}`}
                    data-placeholder={`${cell.getIsPlaceholder()}`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                );
              })}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function cleanDebugData(data: DebugData | undefined) {
  if (!data) {
    return {};
  }
  return [
    Object.fromEntries(
      Object.entries(data || {}).filter(
        (v) => !['type', 'items'].includes(v[0]),
      ),
    ),
    ...(data?.items || []),
  ].reduce(
    (acc: Record<string, unknown>, i: Record<string, unknown>) => ({
      ...acc,
      ...i,
    }),
    {},
  );
}
const renderBytesValue = (v: unknown) => <RenderBytesValue value={v} />;
const renderTSValue = RenderCountNumber; //(v: unknown) =>  RenderCountNumber(v)// renderTimeValue( v as number / 1_000_000);

const TitleMap: Record<
  string,
  { label: string; sortOrder: number; renderFn?: (v: unknown) => unknown }
> = {
  // Core Web Vitals
  cumulativeLayoutShift: { label: 'Cumulative Layout Shift', sortOrder: 1 },
  cumulativeLayoutShiftMainFrame: {
    label: 'Cumulative Layout Shift (Main Frame)',
    sortOrder: 2,
  },
  firstContentfulPaint: {
    label: 'First Contentful Paint',
    sortOrder: 3,
    renderFn: renderTimeValue,
  },
  largestContentfulPaint: {
    label: 'Largest Contentful Paint',
    sortOrder: 4,
    renderFn: renderTimeValue,
  },
  interactive: {
    label: 'Interactive',
    sortOrder: 5,
    renderFn: renderTimeValue,
  },
  totalBlockingTime: {
    label: 'Total Blocking Time',
    sortOrder: 6,
    renderFn: renderTimeValue,
  },

  // LCP Details
  lcpLoadStart: {
    label: 'LCP Load Start',
    sortOrder: 7,
    renderFn: renderTimeValue,
  },
  lcpLoadEnd: {
    label: 'LCP Load End',
    sortOrder: 8,
    renderFn: renderTimeValue,
  },
  lcpInvalidated: {
    label: 'LCP Invalidated',
    sortOrder: 9,
    renderFn: renderTimeValue,
  },

  // Performance Metrics
  speedIndex: {
    label: 'Speed Index',
    sortOrder: 10,
    renderFn: renderTimeValue,
  },
  maxPotentialFID: {
    label: 'Max Potential FID',
    sortOrder: 11,
    renderFn: renderTimeValue,
  },
  timeToFirstByte: {
    label: 'Time To First Byte',
    sortOrder: 12,
    renderFn: renderTimeValue,
  },

  // Network Statistics
  rtt: {
    label: 'Round Trip Time (RTT)',
    sortOrder: 13,
    renderFn: renderTimeValue,
  },
  maxRtt: {
    label: 'Maximum Round Trip Time',
    sortOrder: 14,
    renderFn: renderTimeValue,
  },
  maxServerLatency: {
    label: 'Maximum Server Latency',
    sortOrder: 15,
    renderFn: renderTimeValue,
  },
  throughput: { label: 'Throughput', sortOrder: 16 },
  mainDocumentTransferSize: {
    label: 'Main Document Transfer Size',
    sortOrder: 17,
    renderFn: renderBytesValue,
  },
  totalByteWeight: {
    label: 'Total Byte Weight',
    sortOrder: 18,
    renderFn: renderBytesValue,
  },

  // Resource Counts
  numRequests: {
    label: 'Number of Requests',
    sortOrder: 19,
    renderFn: RenderCountNumber,
  },
  numFonts: {
    label: 'Number of Fonts',
    sortOrder: 20,
    renderFn: RenderCountNumber,
  },
  numScripts: {
    label: 'Number of Scripts',
    sortOrder: 21,
    renderFn: RenderCountNumber,
  },
  numStylesheets: {
    label: 'Number of Stylesheets',
    sortOrder: 22,
    renderFn: RenderCountNumber,
  },

  // Task Timing
  numTasks: {
    label: 'Number of Tasks',
    sortOrder: 23,
    renderFn: RenderCountNumber,
  },
  numTasksOver10ms: {
    label: 'Number of Tasks over 10ms',
    sortOrder: 24,
    renderFn: RenderCountNumber,
  },
  numTasksOver25ms: {
    label: 'Number of Tasks over 25ms',
    sortOrder: 25,
    renderFn: RenderCountNumber,
  },
  numTasksOver50ms: {
    label: 'Number of Tasks over 50ms',
    sortOrder: 26,
    renderFn: RenderCountNumber,
  },
  numTasksOver100ms: {
    label: 'Number of Tasks over 100ms',
    sortOrder: 27,
    renderFn: RenderCountNumber,
  },
  numTasksOver500ms: {
    label: 'Number of Tasks over 500ms',
    sortOrder: 28,
    renderFn: RenderCountNumber,
  },
  totalTaskTime: {
    label: 'Total Task Time',
    sortOrder: 29,
    renderFn: renderTimeValue,
  },

  // Observed Metrics
  observedCumulativeLayoutShift: {
    label: 'Observed Cumulative Layout Shift',
    sortOrder: 30,
  },
  observedCumulativeLayoutShiftMainFrame: {
    label: 'Observed Cumulative Layout Shift Main Frame',
    sortOrder: 31,
  },
  observedFirstPaint: { label: 'Observed First Paint', sortOrder: 32 },
  observedFirstPaintTs: {
    label: 'Observed First Paint Ts',
    sortOrder: 33,
    renderFn: renderTSValue,
  },
  observedFirstContentfulPaint: {
    label: 'Observed First Contentful Paint',
    sortOrder: 34,
  },
  observedFirstContentfulPaintTs: {
    label: 'Observed First Contentful Paint Ts',
    sortOrder: 35,
    renderFn: renderTSValue,
  },
  observedFirstContentfulPaintAllFrames: {
    label: 'Observed First Contentful Paint All Frames',
    sortOrder: 36,
  },
  observedFirstContentfulPaintAllFramesTs: {
    label: 'Observed First Contentful Paint All Frames Ts',
    sortOrder: 37,
    renderFn: renderTSValue,
  },
  observedLargestContentfulPaint: {
    label: 'Observed Largest Contentful Paint',
    sortOrder: 38,
  },
  observedLargestContentfulPaintTs: {
    label: 'Observed Largest Contentful Paint Ts',
    sortOrder: 39,
    renderFn: renderTSValue,
  },
  observedLargestContentfulPaintAllFrames: {
    label: 'Observed Largest Contentful Paint All Frames',
    sortOrder: 40,
  },
  observedLargestContentfulPaintAllFramesTs: {
    label: 'Observed Largest Contentful Paint All Frames Ts',
    sortOrder: 41,
    renderFn: renderTSValue,
  },

  // Page Load Events
  observedDomContentLoaded: {
    label: 'Observed DOM Content Loaded',
    sortOrder: 42,
  },
  observedDomContentLoadedTs: {
    label: 'Observed Dom Content Loaded Ts',
    sortOrder: 43,
    renderFn: renderTSValue,
  },
  observedLoad: { label: 'Observed Load', sortOrder: 44 },
  observedLoadTs: {
    label: 'Observed Load Ts',
    sortOrder: 45,
    renderFn: renderTSValue,
  },

  // Visual Change Events
  observedFirstVisualChange: {
    label: 'Observed First Visual Change',
    sortOrder: 46,
  },
  observedFirstVisualChangeTs: {
    label: 'Observed First Visual Change Ts',
    sortOrder: 47,
    renderFn: renderTSValue,
  },
  observedLastVisualChange: {
    label: 'Observed Last Visual Change',
    sortOrder: 48,
  },
  observedLastVisualChangeTs: {
    label: 'Observed Last Visual Change Ts',
    sortOrder: 49,
    renderFn: renderTSValue,
  },

  // Navigation and Timing
  observedNavigationStart: {
    label: 'Observed Navigation Start',
    sortOrder: 50,
  },
  observedNavigationStartTs: {
    label: 'Observed Navigation Start Ts',
    sortOrder: 51,
    renderFn: renderTSValue,
  },
  observedSpeedIndex: { label: 'Observed Speed Index', sortOrder: 52 },
  observedSpeedIndexTs: {
    label: 'Observed Speed Index Ts',
    sortOrder: 53,
    renderFn: renderTSValue,
  },
  observedTimeOrigin: { label: 'Observed Time Origin', sortOrder: 54 },
  observedTimeOriginTs: {
    label: 'Observed Time Origin Ts',
    sortOrder: 55,
    renderFn: renderTSValue,
  },
  observedTraceEnd: { label: 'Observed Trace End', sortOrder: 56 },
  observedTraceEndTs: {
    label: 'Observed Trace End Ts',
    sortOrder: 57,
    renderFn: renderTSValue,
  },
};

function renderItem(item: unknown, key: string) {
  const renderFn = TitleMap[key as keyof typeof TitleMap]?.renderFn;
  if (renderFn) {
    return renderFn(item);
  }

  if (typeof item === 'string') {
    return item;
  }
  if (typeof item === 'number') {
    return item.toFixed(2);
  }
  if (typeof item === 'boolean') {
    return renderBoolean(item);
  }
  return '';
}

function RenderTitle(s: string) {
  return (
    TitleMap[s as keyof typeof TitleMap]?.label || camelCaseToSentenceCase(s)
  );
}
