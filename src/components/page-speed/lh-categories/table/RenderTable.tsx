/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import {
  AuditDetailOpportunity,
  AuditDetailTable,
  AuditResult,
  ItemValue,
  OpportunityItem,
  TableColumnHeading,
  TableItem,
} from '@/lib/schema';
import {
  getTableItemSortComparator,
  shouldGroupEntity,
} from './getEntityGroupItems';
import { RenderBasicTable } from './RenderBasicTable';
import { RenderEntityTable } from './RenderEntityTable';
import { RenderNodeTable } from './RenderNodeTable';
import { mergedTable } from './utils';
import { Fragment, useMemo, useState } from 'react';
import {
  ColumnDef,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  flexRender,
  getFilteredRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  VisibilityState,
  CellContext,
  RowData,
  Row,
} from '@tanstack/react-table';
import { TableDataItem } from '../../tsTable/TableDataItem';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RenderTableValue } from './RenderTableValue';
import clsx from 'clsx';
import { ExpandAll, ExpandRow } from '../../JSUsage/JSUsageTable';
import { toTitleCase } from '../../toTitleCase';

export function DetailTable({
  mobileDetails,
  desktopDetails,
  title,
}: {
  mobileDetails?: AuditDetailOpportunity | AuditDetailTable;
  desktopDetails?: AuditDetailOpportunity | AuditDetailTable;
  title: string;
}) {
  const { items, headings, device, sortedBy, hasNode } = useMemo(() => {
    const [_headings, _items, _device, _hasNode] = mergedTable(
      desktopDetails?.items,
      mobileDetails?.items,
      mobileDetails?.headings,
      desktopDetails?.headings,
    );
    const _sortedBy = combineAndDedupe(
      desktopDetails?.sortedBy,
      mobileDetails?.sortedBy,
    );
    if (_sortedBy.length && !_hasNode) {
      _items.sort(getTableItemSortComparator(_sortedBy));
    }
    return {
      items: _items,
      headings: _headings,
      device: _device,
      sortedBy: _sortedBy,
      hasNode: _hasNode,
    };
  }, [desktopDetails, mobileDetails]);
  const isEntityGrouped =
    !!desktopDetails?.isEntityGrouped || !!mobileDetails?.isEntityGrouped;
  const shouldRenderEntityTable = shouldGroupEntity(items, isEntityGrouped);
  const skipSumming = combineAndDedupe(
    desktopDetails?.skipSumming,
    mobileDetails?.skipSumming,
  );

  if (shouldRenderEntityTable) {
    <RenderEntityTable
      headings={headings}
      device={device}
      items={items}
      isEntityGrouped={isEntityGrouped}
      skipSumming={skipSumming}
      sortedBy={sortedBy}
    />;
  }

  if (hasNode) {
    return (
      <RenderNodeTable
        headings={headings}
        items={items}
        device={device}
        title={title}
      />
    );
  }

  return (
    <RenderBasicTable
      headings={headings}
      items={items}
      device={device}
      title={title}
    />
  );
}

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    heading?: { heading: TableColumnHeading; _userLabel: string };
    hideFromSubRow?: boolean;
    rowType?: 'main' | 'sub';
    headerType?: 'group' | 'sub';
    // childrenOnly?: boolean;
    // doNotShowInGroup?: boolean;
  }
}

const cell = (info: CellContext<any, unknown>) => {
  const value = info.getValue();
  const key = info.column.id;
  const heading = info?.column?.columnDef?.meta?.heading?.heading;
  const _userLabel = info?.column?.columnDef?.meta?.heading?._userLabel || '';
  const isArray = Array.isArray(value);

  if (!isArray) {
    return (
      <div
        data-info={JSON.stringify(value)}
        data-key={key}
        data-row={JSON.stringify(info.row.original)}
      >
        <RenderTableValue
          value={value as ItemValue}
          heading={heading}
          device={_userLabel}
        />
      </div>
    );
  }

  const isSumRowArray = value.every(
    (v) =>
      Array.isArray(v) &&
      v.length === 2 &&
      typeof v[0] === 'string' &&
      typeof v[1] === 'number',
  );
  if (isSumRowArray) {
    return (value as [string, number][]).map(([ul, val], i) => {
      return (
        <div
          key={i}
          data-info={JSON.stringify(val)}
          data-key={key}
          data-row={JSON.stringify(info.row.original)}
        >
          <RenderTableValue
            value={val as ItemValue}
            heading={heading}
            device={ul}
          />
          {ul && value.length > 1 ? `(${ul})` : null}
        </div>
      );
    });
  }

  // one item display it with no label
  if (isArray && value.length === 1) {
    return (
      <div
        data-info={JSON.stringify(value[0])}
        data-key={key}
        data-row={JSON.stringify(info.row.original)}
      >
        <RenderTableValue
          value={value[0] as ItemValue}
          heading={heading}
          device={_userLabel}
        />
      </div>
    );
  }

  if (isArray && value.length < 2) {
    return info.row.subRows.map((sr, i) => {
      const srItem = sr.getValue(key);
      const srUserLabel = (sr.getValue('device') as string) || '';
      if (srItem === undefined || srItem === '') {
        return null;
      }
      if (heading?.valueType === 'node') {
        return null;
      }
      return (
        <div
          key={i}
          data-info={JSON.stringify(srItem)}
          data-key={key}
          data-row={JSON.stringify(info.row.original)}
        >
          <RenderTableValue
            value={srItem as ItemValue}
            heading={heading}
            device={srUserLabel}
          />
          ({srUserLabel})
        </div>
      );
    });
  }
  // in more
  if (Array.isArray(value)) {
    return (
      <div
        data-info={JSON.stringify(value)}
        data-key={key}
        data-row={JSON.stringify(info.row.original)}
      ></div>
    );
    // return value.map((v, i) => `
    //   if (v === undefined || v === '') {
    //     return null;
    //   }
    //   if(info.column?.columnDef?.meta?.heading?.heading.valueType === 'node' ) {
    //     return null;
    //   }

    //   return (
    //     <div key={i}>
    //       <RenderTableValue
    //         value={v}
    //         heading={info.column?.columnDef?.meta?.heading?.heading}
    //         device={info.column?.columnDef?.meta?.heading?._userLabel || ''}
    //       />
    //       {_userLabel ? `(${_userLabel})` : null}
    //     </div>
    //   );
    // });
  }
};

const accessorFnMainItems =
  (_userLabel: string, key: string, subItemsHeadingKey?: string) =>
  (r: any) => {
    if (_userLabel && r._userLabel !== _userLabel) {
      return undefined;
    }
    const mainItem = r?.item?.[key];
    if (typeof mainItem !== 'undefined') {
      return mainItem;
    }
    // if (subItemsHeadingKey) {
    //   const subItem = r?.subitem?.[subItemsHeadingKey];
    //   return subItem;
    // }
    return undefined;
  };

const accessorFnSubItems =
  (_userLabel: string, key: string, subItemsHeadingKey: string) => (r: any) => {
    if (_userLabel && r._userLabel !== _userLabel) {
      return undefined;
    }
    const subItem = r?.subitem?.[subItemsHeadingKey];
    if (typeof subItem !== 'undefined') {
      return subItem;
    }

    const mainItem = r?.item?.[key];
    if (typeof mainItem !== 'undefined') {
      return mainItem;
    }

    return undefined;
  };
// "code" |  "node" | "text" | "source-location" | "url" | "link" | "numeric" |  "bytes" | "ms" | "thumbnail" | "timespanMs" | "multi"
const canGroup = (type: string) => {
  return ['code', 'text', 'source-location', 'url', 'link'].includes(type);
};
const isUniqueAgg = (type: string) => {
  return [
    'code',
    'text',
    'source-location',
    'url',
    'link',
    'thumbnail',
    'node',
  ].includes(type);
};

const customSum = (aggregationKey: string, rows: Row<DetailTableDataRow>[]) => {
  console.log('agg', aggregationKey, rows);
  const aggregationObj = rows.reduce((acc: Record<string, number>, r) => {
    // const parentValue = r?.getParentRow()?.getValue(aggregationKey);
    let v = r.getValue(aggregationKey);
    if (
      v &&
      typeof v === 'object' &&
      'value' in v &&
      typeof v?.value === 'number'
    ) {
      v = v?.value;
    }

    if (typeof v === 'number') {
      const userLabel = r.getValue('device') as string;
      const c = r.getAllCells().find((c) => c.column.id === aggregationKey);
      if (c?.column?.columnDef?.meta?.rowType !== 'sub') {
        acc[userLabel] = v;
      } else {
        acc[userLabel] = (acc[userLabel] || 0) + v;
      }
    }
    return acc;
  }, {});
  const aggregationArr = Object.entries(aggregationObj);
  console.log('agg', aggregationArr);
  return aggregationArr;
};

export const makeColumnDef = (h: {
  heading: TableColumnHeading;
  _userLabel: string;
  skipSumming?: string[];
}): ColumnDef<DetailTableDataRow, unknown>[] => {
  const key = h.heading.key;
  const _userLabel = h._userLabel;
  const subItemsHeadingKey = h.heading.subItemsHeading?.key;
  const subItemsHeading = {
    ...h.heading,
    ...(h.heading.subItemsHeading || {}),
  };
  const columnDefs: ColumnDef<DetailTableDataRow, unknown>[] = [];

  if (!key) {
    return columnDefs;
  }
  const hideFromSubRow = subItemsHeadingKey
    ? canGroup(h.heading.valueType)
    : undefined;

  columnDefs.push({
    id: `${key}${_userLabel ? `_${_userLabel}` : ''}`,
    header: `${h.heading.label || toTitleCase(h.heading.key || '')}${_userLabel ? ` (${_userLabel})` : ''}`,
    accessorFn: accessorFnMainItems(_userLabel, key, subItemsHeadingKey),
    cell: cell,
    enableGrouping: canGroup(h.heading.valueType),
    enableHiding: true,
    aggregationFn: isUniqueAgg(h.heading.valueType)
      ? 'unique'
      : (h.skipSumming || []).includes(key)
        ? 'unique'
        : customSum,
    meta: {
      heading: h,
      className: '',
      hideFromSubRow: hideFromSubRow,
      rowType: subItemsHeadingKey ? 'main' : undefined,
      headerType: 'group',
    },
  });
  if (subItemsHeadingKey) {
    columnDefs.push({
      id: `${key}${subItemsHeadingKey}${_userLabel ? `_${_userLabel}` : ''}`,
      header: `${subItemsHeading.label}${_userLabel ? ` (${_userLabel})` : ''}`,
      accessorFn: accessorFnSubItems(_userLabel, key, subItemsHeadingKey),
      cell: cell,
      enableGrouping: canGroup(subItemsHeading.valueType),
      enableHiding: true,
      aggregationFn: isUniqueAgg(h.heading.valueType)
        ? 'unique'
        : (h.skipSumming || []).includes(subItemsHeadingKey)
          ? 'unique'
          : customSum,
      meta: {
        heading: {
          heading: subItemsHeading,
          _userLabel: h._userLabel,
        },
        className: '',
        hideFromSubRow: false,
        rowType: 'sub',
      },
    });
  }
  return columnDefs;
};

type DetailTableDataRow = {
  item: TableItem | OpportunityItem;
  subitem?: TableItem | undefined;
  _userLabel: string;
};

export function DetailTable2({
  rows,
}: {
  rows: (TableDataItem & {
    auditResult: AuditResult & {
      details: AuditDetailTable | AuditDetailOpportunity;
    };
  })[];
}) {
  console.log('raw rows', rows);

  const data: DetailTableDataRow[] = useMemo(
    () =>
      rows
        .flatMap((r) =>
          r.auditResult?.details?.items.map((i) => {
            if (i.subItems?.items?.length) {
              return i.subItems?.items.map((v) => {
                return [
                  {
                    item: i,
                    subitem: v,
                    _userLabel: r._userLabel,
                  },
                ];
              });
            }
            return [
              {
                item: i,
                _userLabel: r._userLabel,
              },
            ];
          }),
        )
        .flat(3),
    [rows],
  );
  console.log(data);

  const columns = useMemo(() => {
    // get heading from all the rows
    const allHeadings = rows
      .flatMap((r) => {
        return (r.auditResult?.details?.headings || []).map((h) =>
          !h.key
            ? []
            : [
                {
                  heading: h,
                  skipSumming: r.auditResult?.details?.skipSumming,
                  _userLabel: r._userLabel,
                },
              ],
        );
      })
      .flat(2);
    const acc: Record<string, ColumnDef<DetailTableDataRow, unknown>> = {
      expander: {
        id: 'expander',
        header: ExpandAll,
        cell: ExpandRow,
        enableHiding: false,
        enableGrouping: false,
        enablePinning: true,
      },
    };

    allHeadings.forEach((h) => {
      makeColumnDef({ ...h, _userLabel: '' }).forEach((v) => {
        if (v?.id && !acc[v.id]) {
          acc[v.id] = v;
        }
      });
    });
    allHeadings.forEach((h) =>
      makeColumnDef(h).forEach((v) => {
        if (v?.id && !acc[v.id]) {
          acc[v.id] = v;
        }
      }),
    );

    let columnDefs: ColumnDef<any, unknown>[] = Object.values(acc);
    columnDefs = columnDefs.concat([
      {
        id: 'device',
        header: 'Report type(s)',
        enableHiding: true,
        enableGrouping: false,
        accessorFn: (r) => r._userLabel,
        aggregationFn: 'unique',
        cell: (info) => {
          const value = info.getValue();
          if (Array.isArray(value)) {
            return value.map((v, i) => {
              if (v === undefined || v === '') {
                return null;
              }
              return <div key={i}>{v}</div>;
            });
          }
          return value;
        },
      },
    ]);

    return columnDefs.filter((v) => v);
  }, [rows]);

  console.log('columns', columns);

  const sortbyDefault = useMemo(
    () =>
      rows
        .flatMap(
          (r) => (r.auditResult?.details as AuditDetailTable).sortedBy || [],
        )
        .filter((v, i, a): v is string => !!(v || i === a.indexOf(v)))
        .map((v) => {
          return {
            id: v as string,
            desc: true,
          };
        }),
    [rows],
  );

  // see and control sorting value
  const [sorting, setSorting] = useState<SortingState>(sortbyDefault);
  // set up the grouping values
  const [grouping, setGrouping] = useState<string[]>(() => {
    const groupingVal = columns.reduce(
      (acc: { id: string; rowType?: string }[], v) => {
        if (!v.enableGrouping) {
          return acc;
        }
        const id = v.id;
        if (id && !id.includes('_')) {
          acc.push({ id, rowType: v.meta?.rowType });
        }
        return acc;
      },
      [],
    );
    if (groupingVal.length) {
      const main = groupingVal.find((v) => v.rowType === 'main');
      const sub = groupingVal.find((v) => v.rowType === 'sub');
      if (main || sub) {
        return [main?.id, sub?.id].filter(Boolean) as string[];
      } else {
        return [groupingVal[0].id];
      }
    }
    return ['device'];
  });
  // const [grouping, setGrouping] = useState<string[]>(['url']);

  // hide columns if needed note grouping
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () => ({
      ...(columns.reduce((acc: VisibilityState, v) => {
        const id = v.id;
        if (id) {
          acc[id] = !id?.includes('_');
        }
        return acc;
      }, {}) as VisibilityState),
      expander: true,
    }),
  );

  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(), // core model all data
    onSortingChange: setSorting, // get updates of sorting state
    getSortedRowModel: getSortedRowModel(), // enable sorting

    getFilteredRowModel: getFilteredRowModel(),
    onGroupingChange: setGrouping,
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    // only expand if there is more than one row
    getRowCanExpand: (row) => row.getLeafRows().length > 1,

    onColumnVisibilityChange: setColumnVisibility,

    manualPagination: true, // prevents ssr issues
    // manualExpanding: true,
    // manualGrouping: true,
    enableColumnFilters: true,
    enableColumnPinning: true,
    state: {
      sorting, // set initial sorting state
      grouping,
      columnVisibility,
      columnPinning: {
        left: ['expander'],
      },
    },
  });


  if (data.length === 0) {
    return null;
  }

  return (
    <Table>
      <TableHeader>
        {table
          .getHeaderGroups()
          .map((headerGroup, i) => {
            if (i !== 0) {
              return null;
            }
            return (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers
                  .filter(
                    (header) => header.column.columnDef.meta?.rowType !== 'sub',
                  )
                  .map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                      </TableHead>
                    );
                  })
                  .filter((v) => v)}
              </TableRow>
            );
          })
          .filter((v) => v)}
      </TableHeader>
      <TableBody className='[&_tr:last-child]:border-[length:var(--border-width)]'>
        {table
          .getRowModel()
          .rows.map((row) => {
            return (
              <Fragment key={row.id}>
                <TableRow
                className={clsx(
                  'border-x-[length:var(--border-width)] bg-muted-foreground/10 bg-slate-600 bg-[opacity:var(--border-opacity)]',
                  {},
                )}
                // @ts-expect-error --border-width
                style={{ '--border-width': `${row.depth / 4}rem`, backgroundColor: `hsl(var(--muted-foreground) / ${ (row.depth /10)})`  }}
                >
                  {row.getVisibleCells().map((cell) => {
                    const cellEl = (
                      <TableCell
                        key={cell.id}
                        className="max-w-96 overflow-x-auto whitespace-pre-wrap"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    );
                    if (cell.column.columnDef.meta?.rowType === undefined) {
                      return cellEl;
                    }
                    if (
                      cell.column.columnDef.meta?.rowType === 'main' &&
                      row.depth === 0
                    ) {
                      return cellEl;
                    }
                    if (
                      cell.column.columnDef.meta?.rowType === 'sub' &&
                      row.depth > 0
                    ) {
                      return cellEl;
                    }
                    return null;
                  })}
                </TableRow>

                {/* {row.getIsExpanded() && row.subRows.map((sr, i, arr) => {
                // console.log('sr', sr);
                return (
                  <TableRow
                    key={sr.id}
                    className={clsx('border-x-4 border-x-blue-600', {
                      'border-b-4 border-b-blue-600': i === arr.length - 1,
                      'border-b-none': !(i === arr.length - 1),
                      
                      'border-t-none': !(i === 0),
                    })}
                  >
                    {sr
                      .getVisibleCells()
                      .map((cell) => {
                        if (cell.column.columnDef.meta?.rowType === 'main') {
                          return null;
                          // return (
                          //   <TableCell
                          //     key={cell.id}
                          //     className="max-w-96 overflow-x-auto whitespace-pre-wrap"
                          //   ></TableCell>
                          // );
                        }
                        return (
                          <TableCell
                            key={cell.id}
                            className="max-w-96 overflow-x-auto whitespace-pre-wrap"
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        );
                      })
                      .filter((v) => v)}
                  </TableRow>
                );
              })} */}
              </Fragment>
            );
          })
          .filter((v) => v)}
      </TableBody>
    </Table>
  );
}

function combineAndDedupe<T>(a?: T[], b?: T[]): T[] {
  return [...new Set([...(a || []), ...(b || [])])];
}
