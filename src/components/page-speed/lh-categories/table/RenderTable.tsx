/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import {
  AuditDetailOpportunity,
  AuditDetailTable,
  ItemValue,
  OpportunityItem,
  TableColumnHeading,
  TableItem,
} from '@/lib/schema';
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
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { TableDataItem } from '../../tsTable/TableDataItem';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RenderTableValue } from './RenderTableValue';
import clsx from 'clsx';
import { ExpandAll, ExpandRow } from '../../JSUsage/JSUsageTable';
import { toTitleCase } from '../../toTitleCase';
import { DataTableHeader, DataTableHead } from './DataTableHeader';
import { booleanFilterFn } from './DataTableNoGrouping';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { DataTableBody } from './DataTableBody';
import { DetailTableWith1ReportAndNoSubitem } from './DetailTableWith1ReportAndNoSubitem';

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    heading?: { heading: TableColumnHeading; _userLabel?: string };
    defaultVisibility?: boolean;
    rowType?: 'main' | 'sub';
    headerType?: 'group' | 'sub';
  }
}

const cell = (info: CellContext<any, unknown>) => {
  const value = info.getValue();
  const key = info.column.id;
  const heading = info?.column?.columnDef?.meta?.heading?.heading;
  let _userLabel = info?.column?.columnDef?.meta?.heading?._userLabel || '';
  if (!_userLabel) {
    const original = info.row.original as any;
    if (original && original._userLabel) {
      _userLabel = original._userLabel;
    }
  }

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
    if (value[0][1] === value[0][1]) {
      return (
        <div
          data-info={JSON.stringify(value[0][1])}
          data-key={key}
          data-row={JSON.stringify(info.row.original)}
        >
          <RenderTableValue
            value={value[0][1] as ItemValue}
            heading={heading}
            device={value[0][0]}
          />
          {` (All Devices)`}
        </div>
      );
    }
    return (value as [string, number][]).map(([device, val], i) => {
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
            device={device}
          />
          {device && value.length > 1 ? ` (${device}) ` : null}
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
  }
};

export const simpleTableCell = (info: CellContext<any, unknown>) => {
  const value = info.getValue();
  const heading = info?.column?.columnDef?.meta?.heading?.heading;
  const _userLabel = info?.column?.columnDef?.meta?.heading?._userLabel || '';
  const isArray = Array.isArray(value);

  if (!isArray) {
    return (
      <RenderTableValue
        value={value as ItemValue}
        heading={heading}
        device={_userLabel}
      />
    );
  }
  return value;
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
    return r?.item?.[key];
  };
// "code" |  "node" | "text" | "source-location" | "url" | "link" | "numeric" |  "bytes" | "ms" | "thumbnail" | "timespanMs" | "multi"
export const canGroup = (type: string) => {
  return ['code', 'text', 'source-location', 'url', 'link'].includes(type);
};

export const canSort = (type: string) => {
  return !['node'].includes(type);
};

export const isNumberColumn = (type: string) => {
  return ['numeric', 'bytes', 'ms', 'timespanMs'].includes(type);
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
    size: 125,
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
      let userLabel;
      try {
        userLabel = r.getValue('device') as string;
      } catch (e) {
        userLabel = '';
      }
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

export const makeColumnDef = (
  h: {
    heading: TableColumnHeading;
    _userLabel: string;
    skipSumming?: string[];
  },
  settings: { showUserLabel: boolean },
): ColumnDef<DetailTableDataRow, unknown>[] => {
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
        enableSorting: false,
        ...setSizeSetting(h.heading.valueType),
        aggregationFn: isUniqueAgg(h.heading.valueType)
          ? 'unique'
          : (h.skipSumming || []).includes(key)
            ? 'unique'
            : settings.showUserLabel
              ? customSum
              : 'sum',
              filterFn: canGroup(h.heading.valueType)
              ? 'includesString'
              : isNumberColumn(h.heading.valueType)
                ? 'inNumberRange'
                : undefined,
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
        : settings.showUserLabel
          ? customSum
          : 'sum';
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
          enableSorting: false,
          aggregationFn,
          filterFn: canGroup(subItemsHeading.valueType)
          ? 'includesString'
          : isNumberColumn(subItemsHeading.valueType)
            ? 'inNumberRange'
            : undefined,
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
export type DetailTableItem = {
  auditResult: {
    details: AuditDetailTable | AuditDetailOpportunity;
  };
  _userLabel: string;
};

export function DetailTable({
  rows,
  title,
}: {
  rows: DetailTableItem[];
  title: string;
}) {
  /*
 types of data table
 simple table (1D  no sub item  but having grouping )
 subitems 
 having grouping 
  */

  const hasItems = rows.some(
    (r) => !!(r.auditResult?.details?.items || []).length,
  );
  if (!hasItems) {
    return null;
  }

  const showUserLabel = rows.length > 1;
  const hasSubitems = rows.some((r) =>
    (r.auditResult?.details?.items).some((sr) => sr.subItems?.items?.length),
  );

  if (!showUserLabel) {
    if (!hasSubitems) {
      console.log('1 report no subitems');
      return <DetailTableWith1ReportAndNoSubitem rows={rows} title={title} />;
    } else {
      console.log('1 report with subitems');
      return <DetailTableAndWithSubitem rows={rows} title={title} />;
    }
  } else {
    if (!hasSubitems) {
      console.log('2+ report no subitems');
    } else {
      console.log('2+ report with subitems');
      //  return <DetailTableAndWithSubitem rows={rows} title={title} />;
    }
  }

  return <DetailTableFull rows={rows} title={title} />;
}

function DetailTableAndWithSubitem({
  rows,
  title,
}: {
  rows: DetailTableItem[];
  title: string;
}) {
  'use no memo';
  type Item = {
    item: TableItem;
    subitem?: TableItem;
    _userLabel: string;
  };

  const data = useMemo(() => {
    const d: Item[] = [];
    rows.forEach((r) => {
      return (r.auditResult?.details?.items || []).forEach((item) => {
        if (item.subItems?.items?.length) {
          item.subItems.items.forEach((subitem) => {
            d.push({
              item,
              subitem,
              _userLabel: r._userLabel,
            });
          });
        } else {
          d.push({
            item,
            _userLabel: r._userLabel,
          });
        }
      });
    });

    return d;
  }, [rows]);
  const columns = useMemo(() => {
    const sColumnHelper = createColumnHelper<Item>();
    const columnDef: ColumnDef<Item, any>[] = [getExpandingControlColumn()];

    rows.forEach((r, idx) =>{
      if(idx > 0) {
        return
      }
      r.auditResult.details.headings.forEach((h, i) => {
        if (!h.key) {
          return;
        }
        const key = h.key;
        const subItemKey = h.subItemsHeading?.key;
        const subItem = {
          ...h,
          ...h.subItemsHeading,
        };
        columnDef.push(
          sColumnHelper.accessor(
            (r) => {
              const subItemVal = r.subitem?.[subItemKey as string];
              const itemVal = r.item[key];
              if (
                typeof subItemVal === 'number' &&
                typeof itemVal === 'number'
              ) {
                return +`${itemVal.toString().replace(/[^0-9]/g, '') || 0}.${subItemVal.toString().replace(/[^0-9]/g, '') || 0}`;
              }
              if (
                typeof subItemVal === 'string' &&
                typeof itemVal === 'string'
              ) {
                return `${itemVal}😠😠${subItemVal}`;
              }
              return subItemVal ?? itemVal;
            },
            {
              id: `${key}_${subItemKey}`,
              header: subItem.label as string,
              enableGrouping: canGroup(h.valueType),
              enableHiding: true,
              enableSorting: true,
              enableMultiSort: true,
              filterFn: canGroup(h.valueType)
                ? 'includesString'
                : isNumberColumn(h.valueType)
                  ? 'inNumberRange'
                  : undefined,
              getGroupingValue: (r) => {
                const val = r.item[key];
                if (typeof val === 'string') {
                  return val;
                }
                return undefined;
              },
              ...setSizeSetting(h.valueType),
              cell: (info) => {
                const r = info.row.original;
                const subItemVal = r.subitem?.[subItemKey as string];
                const itemVal = r.item[key];
                const val = subItemVal ?? itemVal;

                return (
                  <div
                    key={JSON.stringify(val)}
                    data-info={JSON.stringify(val)}
                    data-key={key}
                    data-row={JSON.stringify(info.row.original)}
                  >
                    <RenderTableValue
                      value={val as ItemValue}
                      heading={subItem}
                      device={r._userLabel || 'pizza'}
                    />
                  </div>
                );
              },
              aggregatedCell(props) {
                const value = props.row.original.item[key as string];
                return (
                  <RenderTableValue
                    value={value as ItemValue}
                    heading={h}
                    device={r._userLabel || 'pizza2 '}
                  />
                );
              },
              meta: {
                heading: {
                  heading: subItem,
                },
              },
            },
          ),
        );
      })},
    );

    columnDef.push();
    return columnDef;
  }, [rows]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [grouping, setGrouping] = useState<string[]>(() =>
    columns
      .filter((c) => c.id && c.enableGrouping)
      .map((c) => c.id as string)
      .slice(0, 1),
  );
  const table = useReactTable({
    // required items
    columns, // column definitions array
    data, // data array
    getCoreRowModel: getCoreRowModel(), // core row model

    // sub rows and expanding
    // getSubRows: (row) => row?.subItems?.items || [],
    getExpandedRowModel: getExpandedRowModel(),
    enableExpanding: true,

    // grouping
    getGroupedRowModel: getGroupedRowModel(),
    onGroupingChange: setGrouping,
    groupedColumnMode: false,

    // sorting,
    enableSorting: true,
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),

    // filtering,
    enableColumnFilters: true,
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(), // needed for client-side filtering

    // facet filtering
    getFacetedRowModel: getFacetedRowModel(), // client-side faceting
    getFacetedUniqueValues: getFacetedUniqueValues(), // for facet values
    getFacetedMinMaxValues: getFacetedMinMaxValues(),

    // column resizing
    enableColumnResizing: true,
    columnResizeMode: 'onChange',

    filterFns: {
      booleanFilterFn,
    },

    state: {
      sorting,
      columnFilters,
      grouping,
    },
  });
  return (
    <AccordionItem value={title}>
      <AccordionTrigger>
        <div className="text-lg font-bold group-hover:underline">
          {toTitleCase(title)}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <Table
          style={{
            width: table.getTotalSize(),
          }}
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => {
              return (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <DataTableHead key={header.id} header={header} />
                  ))}
                </TableRow>
              );
            })}
          </TableHeader>
          <DataTableBody table={table} />
        </Table>
      </AccordionContent>
    </AccordionItem>
  );
}

function DetailTableFull({
  rows,
  title,
}: {
  rows: DetailTableItem[];
  title: string;
}) {
  'use no memo';
  const showUserLabel = rows.length > 1;
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
      expander: columnHelper.display(getExpandingControlColumn()),
    };

    allHeadings.forEach((h) => {
      makeColumnDef({ ...h, _userLabel: '' }, { showUserLabel }).forEach(
        (v) => {
          if (v?.id && !acc[v.id]) {
            acc[v.id] = v;
          }
        },
      );
    });
    if (showUserLabel) {
      allHeadings.forEach((h) =>
        makeColumnDef(h, { showUserLabel }).forEach((v) => {
          if (v?.id && !acc[v.id]) {
            acc[v.id] = v;
          }
        }),
      );
    }
    let columnDefs: ColumnDef<DetailTableDataRow, any>[] = Object.values(acc);
    if (showUserLabel) {
      columnDefs = columnDefs.concat([
        columnHelper.accessor((r) => r?._userLabel ?? '', {
          id: 'device',
          header: 'Report type(s)',
          enableHiding: true,
          enableGrouping: false,
          enableSorting: false,
          aggregationFn: 'unique',
          size: 110,
          cell: DeviceCell,
          aggregatedCell: DeviceCell,
          meta: {
            defaultVisibility: true,
          },
        }),
      ]);
    }
    return columnDefs.filter((v) => v);
  }, [rows, showUserLabel]);

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
    return showUserLabel ? ['device'] : [];
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
    // groupedColumnMode: false,
    // only expand if there is more than one row
    getRowCanExpand: (row) => {
      // if (row.getIsGrouped() ) {
      //   return row.subRows.length > 1;
      // }
      // return !!row.subRows.length;
      return row.getLeafRows().length > 1;
    },

    onColumnVisibilityChange: setColumnVisibility,

    //columnResizing
    columnResizeMode: 'onChange',

    manualPagination: true, // prevents ssr issues
    enableColumnFilters: true,
    enableColumnPinning: true,

    filterFns: {
      booleanFilterFn: booleanFilterFn,
    },

    state: {
      sorting, // set initial sorting state
      grouping,
      columnVisibility,
      columnPinning: {
        left: ['expander'],
      },
    },
  });

  // console.log('raw rows', rows);
  // console.log('table data', data);
  // console.log('columns', columns);
  // console.log('table', table);
  // console.log('columnVisibility', columnVisibility);
  // console.log('visible rows', table.getRowModel().rows);

  return (
    <Table
      className="table-fixed"
      style={{
        width: table.getTotalSize(),
      }}
    >
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => {
          return (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <DataTableHead key={header.id} header={header} />
              ))}
            </TableRow>
          );
        })}
      </TableHeader>
      <TableBody className="[&_tr:last-child]:border-[length:var(--border-width)]">
        {table
          .getRowModel()
          .rows.map((row) => {
            const depth = row.depth;
            const groupsList = table.getState().grouping;
            const parent = row.getParentRow();
            if (parent && !parent.getCanExpand()) {
              return null;
            }
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
                      cellEl = flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      );
                    } else if (cell.getIsAggregated()) {
                      let cellType = cell.column.columnDef.cell;
                      if (
                        row.getCanExpand() &&
                        groupsList.length > 1 &&
                        depth < groupsList.length - 1
                      ) {
                        cellType = cell.column.columnDef.aggregatedCell;
                      }
                      cellEl = flexRender(cellType, cell.getContext());
                    } else if (cell.getIsPlaceholder()) {
                      let cellType = cell.column.columnDef.cell;
                      if (row.getCanExpand()) {
                        cellType = cell.column.columnDef.aggregatedCell;
                      }
                      cellEl = flexRender(cellType, cell.getContext());
                    } else {
                      cellEl = flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
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
                        data-can-expand={`${row.getCanExpand()}`}
                        data-depth={row.depth}
                        data-row-expanded={`${row.getIsExpanded()}`}
                        data-grouped={`${cell.getIsGrouped()}`}
                        data-aggregated={`${cell.getIsAggregated()}`}
                        data-placeholder={`${cell.getIsPlaceholder()}`}
                        className="overflow-x-auto whitespace-pre-wrap"
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

function getExpandingControlColumn() {
  return {
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
  };
}
