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
import { CSSProperties, Fragment, useMemo, useState } from 'react';
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
  createColumnHelper,
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
  interface ColumnMeta<TData extends RowData, TValue> {
    heading?: { heading: TableColumnHeading; _userLabel: string };
    defaultVisibility?: boolean;
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

const setSizeSetting = (type: string) => {
  if (isUniqueAgg(type)) {
    return {
      size: 400,

    };
  }

  return {
    size: 100,
  };
};

const customSum = (aggregationKey: string, rows: Row<DetailTableDataRow>[]) => {
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
  return aggregationArr;
};

const columnHelper = createColumnHelper<DetailTableDataRow>();

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
  let defaultVisibility = true;
  if (_userLabel) {
    defaultVisibility = false;
  } else if (subItemsHeadingKey) {
    defaultVisibility = false;
  }
  console.log(
    'defaultVisibility',
    defaultVisibility,
    key,
    _userLabel,
    subItemsHeadingKey,
  );
  columnDefs.push(
    columnHelper.accessor(
      accessorFnMainItems(_userLabel, key, subItemsHeadingKey),
      {
        id: `${key}${_userLabel ? `_${_userLabel}` : ''}`,
        header: `${h.heading.label || toTitleCase(h.heading.key || '')}${_userLabel ? ` (${_userLabel})` : ''}`,
        cell: cell,
        aggregatedCell: cell,
        enableGrouping: canGroup(h.heading.valueType),
        enableHiding: true,
        ...setSizeSetting(h.heading.valueType),
        aggregationFn: isUniqueAgg(h.heading.valueType)
          ? 'unique'
          : (h.skipSumming || []).includes(key)
            ? 'unique'
            : customSum,
        meta: {
          heading: h,
          className: '',
          defaultVisibility,
          rowType: subItemsHeadingKey ? 'main' : undefined,
          headerType: 'group',
        },
      },
    ),
  );
  if (subItemsHeadingKey) {
    const aggregationFn =
      isUniqueAgg(subItemsHeading.valueType) ||
      (h.skipSumming || []).includes(subItemsHeadingKey)
        ? 'unique'
        : customSum;
    columnDefs.push(
      columnHelper.accessor(
        accessorFnSubItems(_userLabel, key, subItemsHeadingKey),
        {
          id: `${key}${subItemsHeadingKey}${_userLabel ? `_${_userLabel}` : ''}`,
          header: `${subItemsHeading.label}${_userLabel ? ` (${_userLabel})` : ''}`,
          cell: cell,
          enableGrouping: canGroup(subItemsHeading.valueType),
          ...setSizeSetting(subItemsHeading.valueType),
          enableHiding: true,
          aggregationFn,
          aggregatedCell(info) {
            const value = accessorFnMainItems(
              _userLabel,
              key,
              subItemsHeadingKey,
            )(info.row.original);
            // const depth = info.row.depth;
            const heading = h.heading;
            if (Array.isArray(value) && value.every((v) => v?.length === 2)) {
              return value.map((v, i) => (
                <div
                  key={JSON.stringify(v)}
                  data-info={JSON.stringify(v[1])}
                  data-key={key}
                  data-row={JSON.stringify(info.row.original)}
                >
                  <RenderTableValue
                    value={v[1] as ItemValue}
                    heading={heading}
                    device={v[0]}
                  />
                </div>
              ));
            }

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
          },
          meta: {
            heading: {
              heading: subItemsHeading,
              _userLabel: h._userLabel,
            },
            className: '',
            defaultVisibility: !_userLabel,
            rowType: 'sub',
          },
        },
      ),
    );
  }
  return columnDefs;
};

type DetailTableDataRow = {
  item: TableItem | OpportunityItem;
  subitem?: TableItem | undefined;
  _userLabel: string;
};

function DeviceCell(info: CellContext<DetailTableDataRow, any>) {
  const value = info.getValue();

  if (Array.isArray(value)) {
    return value
      .filter((v) => v != null && v !== '')
      .map((v, i) => <div key={i}>{v}</div>);
  }
  return value as string;
}

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
    const acc: Record<string, ColumnDef<DetailTableDataRow, any>> = {
      expander: columnHelper.display({
        id: 'expander',
        header: ExpandAll,
        cell: ExpandRow,
        aggregatedCell: ExpandRow,
        size: 56,
        enableHiding: false,
        enableGrouping: false,
        enablePinning: true,
        enableSorting: false,
        enableResizing: false,
        meta: {
          defaultVisibility: true,
        },
      }),
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

    let columnDefs: ColumnDef<DetailTableDataRow, any>[] = Object.values(acc);
    columnDefs = columnDefs.concat([
      columnHelper.accessor((r) => r?._userLabel ?? '', {
        id: 'device',
        header: 'Report type(s)',
        enableHiding: true,
        enableGrouping: false,
        aggregationFn: 'unique',
        size: 110,
        cell: DeviceCell,
        aggregatedCell: DeviceCell,
        meta: {
          defaultVisibility: true,
        },
      }),
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
          // v.meta?.defaultVisibility && (acc[id] = false);
          acc[id] = !!v.meta?.defaultVisibility;
        }
        return acc;
      }, {}) as VisibilityState),
    }),
  );

  const table = useReactTable({
    columns, // define the columns (required  )
    data,
    getCoreRowModel: getCoreRowModel(), // core model all data
    onSortingChange: setSorting, // get updates of sorting state
    getSortedRowModel: getSortedRowModel(), // enable sorting

    getFilteredRowModel: getFilteredRowModel(),
    onGroupingChange: setGrouping,
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    groupedColumnMode: false,
    // only expand if there is more than one row
    getRowCanExpand: (row) => row.subRows.length > 1,

    onColumnVisibilityChange: setColumnVisibility,

    //columnResizing
    columnResizeMode: 'onChange',

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

  console.log('table', table);
  console.log('columnVisibility', columnVisibility);
  console.log('visible rows', table.getRowModel().rows);

  /**
   * Instead of calling `column.getSize()` on every render for every header
   * and especially every data cell (very expensive),
   * we will calculate all column sizes at once at the root table level in a useMemo
   * and pass the column sizes down as CSS variables to the <table> element.
   */
  const flatHeaders = table.getFlatHeaders();
  const columnSizeVars = useMemo(() => {
    const colSizes: { [key: string]: number } = {};
    for (let i = 0; i < flatHeaders.length; i++) {
      const header = flatHeaders[i]!;
      colSizes[`--header-${header.id}-size`] = header.getSize();
      colSizes[`--col-${header.column.id}-size`] = header.column.getSize();
    }
    return colSizes;
  }, [flatHeaders]);

  if (data.length === 0) {
    return null;
  }

  return (
    <Table
      className="table-fixed"
      style={{
        ...columnSizeVars, //Define column sizes on the <table> element
        width: table.getTotalSize(),
      }}
    >
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
                  .map((header) => {
                    return (
                      <TableHead
                        key={header.id}
                        className="relative"
                        style={{
                          width: `calc(var(--header-${header?.id}-size) * 1px)`,
                        }}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {header.column.columnDef.enableResizing !== false  ? <div
                          onDoubleClick={() => header.column.resetSize()}
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={clsx(
                            `absolute right-0 top-0 h-full w-[5px] cursor-col-resize touch-none select-none bg-muted/50 transition-opacity duration-200`,
                            {
                              'bg-muted':
                                header.column.getIsResizing(),
                            },
                          )}
                        /> : null}
                      </TableHead>
                    );
                  })
                  .filter((v) => v)}
              </TableRow>
            );
          })
          .filter((v) => v)}
      </TableHeader>
      <TableBody className="[&_tr:last-child]:border-[length:var(--border-width)]">
        {table
          .getRowModel()
          .rows.map((row) => {
            const depth = row.depth;
            const groupsList = table.getState().grouping;

            // if (rows.length === 1 &&  row.depth > 0 && row.getParentRow()?.original === row.original) {
            //   return null;
            // }
            return (
              <Fragment key={row.id}>
                <TableRow
                  className={clsx(
                    'bg-[opacity:var(--border-opacity)] border-x-[length:var(--border-width)] bg-muted-foreground/10 bg-slate-600',
                    {},
                  )}
                  style={
                    {
                      '--border-width': `${row.depth / 4}rem`,
                      backgroundColor: `hsl(var(--muted-foreground) / ${row.depth / 10})`,
                    } as CSSProperties
                  }
                >
                  {row.getVisibleCells().map((cell) => {
                    let cellEl = null;

                    if (cell.getIsGrouped()) {
                      cellEl = (
                        <div>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </div>
                      );
                    } else if (cell.getIsAggregated()) {
                      let cellType = cell.column.columnDef.cell;
                      if (row.getCanExpand() && (groupsList.length > 1 && depth < 1)) {
                        cellType = cell.column.columnDef.aggregatedCell;
                      }
                      cellEl = (
                        <div>{flexRender(cellType, cell.getContext())}</div>
                      );
                    } else if (cell.getIsPlaceholder()) {
                      let cellType = cell.column.columnDef.cell;
                      if (row.getCanExpand()) {
                        cellType = cell.column.columnDef.aggregatedCell;
                      }
                      cellEl = (
                        <div>{flexRender(cellType, cell.getContext())}</div>
                      );
                    } else {
                      cellEl = (
                        <div>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </div>
                      );
                    }
                    if (!cellEl) {
                      return null;
                    }
                    return (
                      <TableCell
                        key={cell.id}
                        data-cell-id={cell.id}
                        data-column-id={cell.column.id}
                        data-can-expand={row.getCanExpand()}
                        data-depth={row.depth}
                        data-expanded={row.getIsExpanded}
                        data-grouped={cell.getIsGrouped()}
                        data-aggregated={cell.getIsAggregated()}
                        data-placeholder={cell.getIsPlaceholder()}
                        className="max-w-96 overflow-x-auto whitespace-pre-wrap"
                      >
                        {cellEl}
                      </TableCell>
                    );
                  })}
                </TableRow>
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
