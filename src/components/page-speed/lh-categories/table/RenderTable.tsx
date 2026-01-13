'use client';
import {
  AuditDetailOpportunity,
  AuditDetailTable,
  ItemValue,
  ItemValueType,
  OpportunityItem,
  TableColumnHeading,
  TableItem,
} from '@/lib/schema';
import { CSSProperties, Fragment, useMemo, useState, startTransition, type ReactElement } from 'react';
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
  getFacetedMinMaxValues,
  VisibilityState,
  CellContext,
  RowData,
  Row,
  createColumnHelper,
  Cell,
} from '@tanstack/react-table';
import { RenderTableValue } from '@/components/page-speed/lh-categories/table/RenderTableValue';
import clsx from 'clsx';
import { cn } from '@/lib/utils';
import { ExpandAll, ExpandRow } from '@/components/page-speed/JSUsage/JSUsageTable';
import { toTitleCase } from '@/components/page-speed/toTitleCase';
import { DataTableHeader } from '@/components/page-speed/lh-categories/table/DataTableHeader';
import { booleanFilterFn } from '@/components/page-speed/lh-categories/table/DataTableNoGrouping';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { DataTableBody } from '@/components/page-speed/lh-categories/table/DataTableBody';
import { DetailTableWith1ReportAndNoSubitem } from '@/components/page-speed/lh-categories/table/DetailTableWith1ReportAndNoSubitem';
import { DetailTableSeparatePerReport } from '@/components/page-speed/lh-categories/table/DetailTableSeparatePerReport';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { useStandardTable } from '@/components/page-speed/shared/tableConfigHelpers';
import { shouldShowSeparateTablesPerReport } from '@/components/page-speed/auditTableConfig';
import {
  GROUPABLE_VALUE_TYPES,
  UNIQUE_AGG_VALUE_TYPES,
  NUMERIC_VALUE_TYPES,
  COLUMN_SIZE_DEFAULT,
  COLUMN_SIZE_LARGE,
  EXPANDER_COLUMN_SIZE,
  DEVICE_COLUMN_SIZE,
  DEVICE_LABEL_SEPARATOR,
} from '@/components/page-speed/lh-categories/table/constants';

// Type definitions
type DetailTableDataRow = {
  item: TableItem | OpportunityItem;
  subitem?: TableItem | undefined;
  _userLabel: string;
};

export type DetailTableItem = {
  auditResult: {
    details: AuditDetailTable | AuditDetailOpportunity;
  };
  _userLabel: string;
};

type ColumnHeadingConfig = {
  heading: TableColumnHeading;
  _userLabel: string;
  skipSumming?: string[];
};

type DeviceValuePair = [string, number];

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    heading?: { heading: TableColumnHeading; _userLabel?: string };
    defaultVisibility?: boolean;
    rowType?: 'main' | 'sub';
    headerType?: 'group' | 'sub';
  }
}

/**
 * Gets the user label from column meta or row original data
 */
const getUserLabel = (
  info: CellContext<DetailTableDataRow, unknown>,
): string => {
  const metaLabel = info.column.columnDef.meta?.heading?._userLabel;
  if (metaLabel) {
    return metaLabel;
  }
  return info.row.original._userLabel || '';
};

/**
 * Checks if value is an array of device-value pairs
 */
const isDeviceValuePairArray = (
  value: unknown,
): value is DeviceValuePair[] => {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (v): v is DeviceValuePair =>
        Array.isArray(v) &&
        v.length === 2 &&
        typeof v[0] === 'string' &&
        typeof v[1] === 'number',
    )
  );
};

/**
 * Renders a single value with optional device label
 */
const renderValueWithLabel = (
  value: ItemValue,
  heading: TableColumnHeading | undefined,
  device: string,
  showLabel = false,
): ReactElement => {
  return (
    <div>
      <RenderTableValue value={value} heading={heading} device={device} />
      {showLabel && device && (
        <span className="text-xs text-muted-foreground"> ({device})</span>
      )}
    </div>
  );
};

/**
 * Renders device-value pairs (aggregated data from multiple devices)
 */
const renderDeviceValuePairs = (
  pairs: DeviceValuePair[],
  heading: TableColumnHeading | undefined,
): ReactElement => {
  if (pairs.length === 0) {
    return <></>;
  }

  // If there's only one device, show that device's name
  if (pairs.length === 1) {
    return (
      <>
        <RenderTableValue
          value={pairs[0][1] as ItemValue}
          heading={heading}
          device={pairs[0][0]}
        />
        <span className="text-xs text-muted-foreground"> ({pairs[0][0]})</span>
      </>
    );
  }

  // Render each device-value pair on separate lines
  return (
    <div className="flex flex-col gap-1">
      {pairs.map(([device, val], i) => (
        <div key={i}>
          {renderValueWithLabel(
            val as ItemValue,
            heading,
            device,
            pairs.length > 1,
          )}
        </div>
      ))}
    </div>
  );
};

/**
 * Renders sub-rows values when array has less than 2 items
 */
const renderSubRowValues = (
  info: CellContext<DetailTableDataRow, unknown>,
  key: string,
  heading: TableColumnHeading | undefined,
): (ReactElement | null)[] => {
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
      <Fragment key={i}>
        {renderValueWithLabel(
          srItem as ItemValue,
          heading,
          srUserLabel,
          true,
        )}
      </Fragment>
    );
  });
};

/**
 * Main cell renderer for table cells
 */
const cell = (info: CellContext<DetailTableDataRow, unknown>) => {
  const value = info.getValue();
  const key = info.column.id;
  const heading = info.column.columnDef.meta?.heading?.heading;
  const _userLabel = getUserLabel(info);
  const rowDepth = info.row.depth;
  // Show device label for sub-rows (depth > 0) in grouped tables, but not for the device column itself
  const showDeviceLabel = rowDepth > 0 && _userLabel && key !== 'device';

  // Handle non-array values
  if (!Array.isArray(value)) {
    if (showDeviceLabel) {
      return renderValueWithLabel(value as ItemValue, heading, _userLabel, true);
    }
    return (
      <RenderTableValue
        value={value as ItemValue}
        heading={heading}
        device={_userLabel}
      />
    );
  }

  // Handle device-value pair arrays (aggregated data)
  if (isDeviceValuePairArray(value)) {
    return renderDeviceValuePairs(value, heading);
  }

  // Handle single-item arrays
  if (value.length === 1) {
    if (showDeviceLabel) {
      return renderValueWithLabel(value[0] as ItemValue, heading, _userLabel, true);
    }
    return (
      <RenderTableValue
        value={value[0] as ItemValue}
        heading={heading}
        device={_userLabel}
      />
    );
  }

  // Handle arrays with sub-rows (length < 2 means empty or single, but check subRows)
  if (value.length < 2 && info.row.subRows.length > 0) {
    return renderSubRowValues(info, key, heading);
  }

  // For other array cases, return null
  return null;
};

/**
 * Simple cell renderer that doesn't handle complex array cases
 */
export const simpleTableCell = (
  info: CellContext<DetailTableDataRow, unknown>,
) => {
  const value = info.getValue();
  const heading = info.column.columnDef.meta?.heading?.heading;
  const _userLabel = getUserLabel(info);

  if (!Array.isArray(value)) {
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


/**
 * Accessor function for main items in a table row
 */
const accessorFnMainItems =
  (_userLabel: string, key: string) =>
  (r: DetailTableDataRow): unknown => {
    if (_userLabel && r._userLabel !== _userLabel) {
      return undefined;
    }
    const mainItem = r.item?.[key];
    if (typeof mainItem !== 'undefined') {
      return mainItem;
    }
    return undefined;
  };

/**
 * Accessor function for sub-items in a table row
 */
const accessorFnSubItems =
  (_userLabel: string, key: string, subItemsHeadingKey: string) =>
  (r: DetailTableDataRow): unknown => {
    if (_userLabel && r._userLabel !== _userLabel) {
      return undefined;
    }
    const subItem = r.subitem?.[subItemsHeadingKey];
    if (typeof subItem !== 'undefined') {
      return subItem;
    }
    return r.item?.[key];
  };

/**
 * Checks if a value type can be grouped
 */
export const canGroup = (type: ItemValueType | string): boolean => {
  return GROUPABLE_VALUE_TYPES.includes(type as ItemValueType);
};

/**
 * Checks if a value type can be sorted
 */
export const canSort = (type: ItemValueType | string): boolean => {
  return type !== 'node';
};

/**
 * Checks if a value type represents a number column
 */
export const isNumberColumn = (type: ItemValueType | string): boolean => {
  return NUMERIC_VALUE_TYPES.includes(type as ItemValueType);
};

/**
 * Checks if a value type should use unique aggregation
 */
const isUniqueAgg = (type: ItemValueType | string): boolean => {
  return UNIQUE_AGG_VALUE_TYPES.includes(type as ItemValueType);
};

/**
 * Returns size settings based on value type
 */
const setSizeSetting = (type: ItemValueType | string) => {
  return {
    size: isUniqueAgg(type) ? COLUMN_SIZE_LARGE : COLUMN_SIZE_DEFAULT,
  };
};

/**
 * Custom aggregation function that sums values by device/user label
 */
const customSum = (
  aggregationKey: string,
  rows: Row<DetailTableDataRow>[],
): DeviceValuePair[] => {
  const aggregationObj = rows.reduce((acc: Record<string, number>, r) => {
    let v = r.getValue(aggregationKey);

    // Extract numeric value from object if needed
    if (
      v &&
      typeof v === 'object' &&
      'value' in v &&
      typeof (v as { value: unknown }).value === 'number'
    ) {
      v = (v as { value: number }).value;
    }

    if (typeof v === 'number') {
      const userLabel = (r.getValue('device') as string) || '';
      const cell = r.getAllCells().find((c) => c.column.id === aggregationKey);
      const rowType = cell?.column?.columnDef?.meta?.rowType;

      if (rowType !== 'sub') {
        acc[userLabel] = v;
      } else {
        acc[userLabel] = (acc[userLabel] || 0) + v;
      }
    }
    return acc;
  }, {});

  return Object.entries(aggregationObj) as DeviceValuePair[];
};

const columnHelper = createColumnHelper<DetailTableDataRow>();

/**
 * Determines the aggregation function to use for a column
 */
const getAggregationFn = (
  valueType: ItemValueType | string,
  key: string,
  skipSumming: string[] | undefined,
  showUserLabel: boolean,
): 'unique' | 'sum' | typeof customSum => {
  if (isUniqueAgg(valueType) || (skipSumming || []).includes(key)) {
    return 'unique';
  }
  return showUserLabel ? customSum : 'sum';
};

/**
 * Determines the filter function to use for a column
 */
const getFilterFn = (
  valueType: ItemValueType | string,
): 'includesString' | 'inNumberRange' | undefined => {
  if (canGroup(valueType)) {
    return 'includesString';
  }
  if (isNumberColumn(valueType)) {
    return 'inNumberRange';
  }
  return undefined;
};

/**
 * Creates column definitions for a table heading
 */
export const makeColumnDef = (
  h: ColumnHeadingConfig,
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

  const defaultVisibility = !_userLabel && !subItemsHeadingKey;
  const valueType = h.heading.valueType || 'text';

  // Main column definition
  columnDefs.push(
    columnHelper.accessor(
      accessorFnMainItems(_userLabel, key),
      {
        id: `${key}${_userLabel ? `_${_userLabel}` : ''}`,
        header: `${h.heading.label || toTitleCase(key)}${_userLabel ? ` (${_userLabel})` : ''}`,
        cell,
        aggregatedCell: cell,
        enableGrouping: canGroup(valueType),
        enableHiding: true,
        enableSorting: canSort(valueType),
        ...setSizeSetting(valueType),
        aggregationFn: getAggregationFn(
          valueType,
          key,
          h.skipSumming,
          settings.showUserLabel,
        ),
        filterFn: getFilterFn(valueType),
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

  // Sub-items column definition (if applicable)
  if (subItemsHeadingKey) {
    const subValueType = subItemsHeading.valueType || 'text';
    columnDefs.push(
      columnHelper.accessor(
        accessorFnSubItems(_userLabel, key, subItemsHeadingKey),
        {
          id: `${key}${subItemsHeadingKey}${_userLabel ? `_${_userLabel}` : ''}`,
          header: `${subItemsHeading.label || ''}${_userLabel ? ` (${_userLabel})` : ''}`,
          cell,
          enableGrouping: canGroup(subValueType),
          ...setSizeSetting(subValueType),
          enableHiding: true,
          enableSorting: canSort(subValueType),
          aggregationFn: getAggregationFn(
            subValueType,
            subItemsHeadingKey,
            h.skipSumming,
            settings.showUserLabel,
          ),
          filterFn: getFilterFn(subValueType),
          aggregatedCell(info) {
            const value = accessorFnMainItems(_userLabel, key)(
              info.row.original,
            );

            if (isDeviceValuePairArray(value)) {
              return (
                <>
                  {value.map((v, i) => (
                    <Fragment key={i}>
                      <RenderTableValue
                        value={v[1] as ItemValue}
                        heading={h.heading}
                        device={v[0]}
                      />
                    </Fragment>
                  ))}
                </>
              );
            }

            return (
              <RenderTableValue
                value={value as ItemValue}
                heading={h.heading}
                device={_userLabel}
              />
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

/**
 * Cell renderer for device/user label column
 */
function DeviceCell(info: CellContext<DetailTableDataRow, unknown>) {
  const value = info.getValue();

  if (Array.isArray(value)) {
    return (
      <>
        {value
          .filter((v) => v != null && v !== '')
          .map((v, i) => (
            <div key={i}>{String(v)}</div>
          ))}
      </>
    );
  }
  return <>{String(value)}</>;
}

/**
 * Main component that routes to the appropriate table implementation
 * based on the data structure and audit configuration
 */
export function DetailTable({
  rows,
  title,
}: {
  rows: DetailTableItem[];
  title: string;
}) {
  const hasItems = useMemo(
    () => rows.some((r) => !!(r.auditResult?.details?.items || []).length),
    [rows],
  );

  if (!hasItems) {
    return null;
  }

  // Check if this audit should show separate tables per report
  const auditId = (rows[0]?.auditResult as { id?: string })?.id;
  if (auditId && shouldShowSeparateTablesPerReport(auditId)) {
    return <DetailTableSeparatePerReport rows={rows} title={title} />;
  }

  const showUserLabel = rows.length > 1;
  const hasSubitems = rows.some((r) =>
    (r.auditResult?.details?.items || []).some(
      (item) => item.subItems?.items?.length,
    ),
  );

  // Route to appropriate table component based on data structure
  if (!showUserLabel) {
    if (!hasSubitems) {
      return <DetailTableWith1ReportAndNoSubitem rows={rows} title={title} />;
    }
    return <DetailTableAndWithSubitem rows={rows} title={title} />;
  }

  return <DetailTableFull rows={rows} title={title} />;
}

/**
 * Combines item and subitem values for sorting/comparison
 */
const combineItemSubItemValue = (
  itemVal: unknown,
  subItemVal: unknown,
): unknown => {
  if (typeof subItemVal === 'number' && typeof itemVal === 'number') {
    // Combine numbers: item.subitem format (e.g., 123.45)
    const itemNum = Number(itemVal.toString().replace(/[^0-9]/g, '')) || 0;
    const subNum = Number(subItemVal.toString().replace(/[^0-9]/g, '')) || 0;
    return Number(`${itemNum}.${subNum}`);
  }

  if (typeof subItemVal === 'string' && typeof itemVal === 'string') {
    // Combine strings with separator for sorting
    return `${itemVal}${DEVICE_LABEL_SEPARATOR}${subItemVal}`;
  }

  return subItemVal ?? itemVal;
};

function DetailTableAndWithSubitem({
  rows,
  title,
}: {
  rows: DetailTableItem[];
  title: string;
}) {
  // Transform data
  type DetailTableAndWithSubitemRow = {
    item: TableItem;
    subitem?: TableItem;
    _userLabel: string;
  };

  const data = useMemo<DetailTableAndWithSubitemRow[]>(() => {
    const d: DetailTableAndWithSubitemRow[] = [];
    rows.forEach((r) => {
      (r.auditResult?.details?.items || []).forEach((item) => {
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

  // Create columns
  const columns = useMemo(() => {
    const sColumnHelper = createColumnHelper<DetailTableAndWithSubitemRow>();
    const columnDef: ColumnDef<DetailTableAndWithSubitemRow, unknown>[] = [
      getExpandingControlColumn(),
    ];

    const firstRow = rows[0];
    if (!firstRow) {
      return columnDef;
    }

    firstRow.auditResult.details.headings.forEach((h) => {
      if (!h.key) {
        return;
      }

      const key = h.key;
      const subItemKey = h.subItemsHeading?.key;
      if (!subItemKey) {
        return;
      }

      const subItem = {
        ...h,
        ...h.subItemsHeading,
      };
      const valueType = h.valueType || 'text';

      columnDef.push(
        sColumnHelper.accessor(
          (r) => {
            const subItemVal = r.subitem?.[subItemKey];
            const itemVal = r.item[key];
            return combineItemSubItemValue(itemVal, subItemVal);
          },
          {
            id: `${key}_${subItemKey}`,
            header: (subItem.label as string) || '',
            enableGrouping: canGroup(valueType),
            enableHiding: true,
            enableSorting: true,
            enableMultiSort: true,
            filterFn: getFilterFn(valueType),
            getGroupingValue: (r) => {
              const val = r.item[key];
              return typeof val === 'string' ? val : undefined;
            },
            ...setSizeSetting(valueType),
            cell: (info) => {
              const r = info.row.original;
              const subItemVal = r.subitem?.[subItemKey];
              const itemVal = r.item[key];
              const val = subItemVal ?? itemVal;

              return (
                <RenderTableValue
                  key={JSON.stringify(val)}
                  value={val as ItemValue}
                  heading={subItem}
                  device={r._userLabel || ''}
                />
              );
            },
            aggregatedCell(props) {
              const value = props.row.original.item[key];
              return (
                <RenderTableValue
                  value={value as ItemValue}
                  heading={h}
                  device={firstRow._userLabel || ''}
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
    });

    return columnDef;
  }, [rows]);

  // Calculate default grouping
  const defaultGrouping = useMemo(() => {
    const groupableColumn = columns.find(
      (c) => c.id && c.enableGrouping,
    )?.id;
    return groupableColumn ? [groupableColumn] : [];
  }, [columns]);

  const table = useStandardTable({
    data,
    columns,
    grouping: defaultGrouping,
    enablePagination: false,
  });

  return (
    <AccordionItem value={title}>
      <AccordionTrigger>
        <div className="min-w-0 flex-1 truncate text-lg font-bold group-hover:underline">
          {toTitleCase(title)}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="w-full overflow-x-auto">
          <Table className="w-full" style={{ width: '100%' }}>
            <DataTableHeader table={table} />
            <DataTableBody table={table} />
          </Table>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

/**
 * Transforms audit result items into table data rows
 */
const transformTableData = (
  rows: DetailTableItem[],
): DetailTableDataRow[] => {
  return rows
    .flatMap((r) =>
      (r.auditResult?.details?.items || []).map((item) => {
        if (item.subItems?.items?.length) {
          return item.subItems.items.map((subitem) => ({
            item,
            subitem,
            _userLabel: r._userLabel,
          }));
        }
        return [
          {
            item,
            _userLabel: r._userLabel,
          },
        ];
      }),
    )
    .flat(2);
};

/**
 * Extracts all unique headings from all rows
 */
const extractAllHeadings = (
  rows: DetailTableItem[],
): ColumnHeadingConfig[] => {
  return rows
    .flatMap((r) =>
      (r.auditResult?.details?.headings || []).map((h) =>
        !h.key
          ? []
          : [
              {
                heading: h,
                skipSumming: r.auditResult?.details?.skipSumming,
                _userLabel: r._userLabel,
              },
            ],
      ),
    )
    .flat(2);
};

/**
 * Creates column definitions from headings
 */
const createColumnsFromHeadings = (
  allHeadings: ColumnHeadingConfig[],
  showUserLabel: boolean,
): ColumnDef<DetailTableDataRow, unknown>[] => {
  const columnMap: Record<string, ColumnDef<DetailTableDataRow, unknown>> = {
    expander: columnHelper.display(getExpandingControlColumn()),
  };

  // Add base columns (without user label)
  allHeadings.forEach((h) => {
    makeColumnDef({ ...h, _userLabel: '' }, { showUserLabel }).forEach(
      (col) => {
        if (col?.id && !columnMap[col.id]) {
          columnMap[col.id] = col;
        }
      },
    );
  });

  // Add user-label specific columns if needed
  if (showUserLabel) {
    allHeadings.forEach((h) => {
      makeColumnDef(h, { showUserLabel }).forEach((col) => {
        if (col?.id && !columnMap[col.id]) {
          columnMap[col.id] = col;
        }
      });
    });
  }

  // Add device column if showing user labels
  if (showUserLabel) {
    const deviceColumn = columnHelper.accessor(
      (r) => r?._userLabel ?? '',
      {
        id: 'device',
        header: 'Report type(s)',
        enableHiding: true,
        enableGrouping: false,
        enableSorting: true,
        aggregationFn: 'unique',
        size: DEVICE_COLUMN_SIZE,
        cell: DeviceCell,
        aggregatedCell: DeviceCell,
        meta: {
          defaultVisibility: false,
        },
      },
    );
    columnMap.device = deviceColumn as ColumnDef<DetailTableDataRow, unknown>;
  }

  return Object.values(columnMap).filter(Boolean);
};

/**
 * Calculates default sorting from audit results
 * Only includes columns that actually exist in the table
 */
const calculateDefaultSorting = (
  rows: DetailTableItem[],
  availableColumnIds: Set<string>,
): SortingState => {
  const sortedByKeys = rows
    .flatMap(
      (r) => (r.auditResult?.details as AuditDetailTable).sortedBy || [],
    )
    .filter((v, i, a): v is string => !!(v && i === a.indexOf(v)));

  // Map sortedBy keys to actual column IDs that exist
  return sortedByKeys
    .map((key) => {
      // First try exact match
      if (availableColumnIds.has(key)) {
        return { id: key, desc: true };
      }

      // Try to find a column that starts with the key (for user label suffixes)
      // Format: key or key_userLabel
      const matchingId = Array.from(availableColumnIds).find(
        (id) => id === key || id.startsWith(`${key}_`),
      );

      return matchingId ? { id: matchingId, desc: true } : null;
    })
    .filter((v): v is { id: string; desc: boolean } => v !== null);
};

/**
 * Calculates default grouping from columns
 */
const calculateDefaultGrouping = (
  columns: ColumnDef<DetailTableDataRow, unknown>[],
  showUserLabel: boolean,
): string[] => {
  const groupingCandidates = columns
    .filter((c) => c.enableGrouping && c.id && !c.id.includes('_'))
    .map((c) => ({
      id: c.id as string,
      rowType: c.meta?.rowType,
    }));

  if (groupingCandidates.length === 0) {
    // Don't default to 'device' grouping if device column is hidden by default
    const deviceColumn = columns.find((c) => c.id === 'device');
    const deviceIsVisible = deviceColumn?.meta?.defaultVisibility !== false;
    return showUserLabel && deviceIsVisible ? ['device'] : [];
  }

  const main = groupingCandidates.find((v) => v.rowType === 'main');
  const sub = groupingCandidates.find((v) => v.rowType === 'sub');

  if (main || sub) {
    return [main?.id, sub?.id].filter(Boolean) as string[];
  }

  return [groupingCandidates[0].id];
};

/**
 * Calculates default column visibility
 */
const calculateDefaultColumnVisibility = (
  columns: ColumnDef<DetailTableDataRow, unknown>[],
): VisibilityState => {
  return columns.reduce((acc: VisibilityState, col) => {
    const id = col.id;
    if (id) {
      acc[id] = !!col.meta?.defaultVisibility;
    }
    return acc;
  }, {});
};

/**
 * Renders a table cell based on its state
 */
const renderTableCell = (
  cell: Cell<DetailTableDataRow, unknown>,
  row: Row<DetailTableDataRow>,
  groupsList: string[],
): ReactElement | null => {
  let cellEl: React.ReactNode = null;

  if (cell.getIsGrouped()) {
    cellEl = flexRender(cell.column.columnDef.cell, cell.getContext());
  } else if (cell.getIsAggregated()) {
    let cellType = cell.column.columnDef.cell;
    if (
      row.getCanExpand() &&
      groupsList.length > 1 &&
      row.depth < groupsList.length - 1
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
    cellEl = flexRender(cell.column.columnDef.cell, cell.getContext());
  }

  if (!cellEl || (typeof cellEl === 'object' && !('type' in cellEl))) {
    return null;
  }

  // const isExpanderColumn = cell.column.id === 'expander';
  
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
      className={cn(
        "overflow-x-auto whitespace-pre-wrap transition-all duration-300 ease-in-out",
        // {
        //   "!p-0 flex items-center justify-center overflow-hidden": isExpanderColumn,
        // }
      )}
      style={{
        width: `${cell.column.getSize()}px`,
        // ...(isExpanderColumn && {
        //   minWidth: `${cell.column.getSize()}px`,
        //   maxWidth: `${cell.column.getSize()}px`,
        //   boxSizing: 'border-box',
        // }),
        viewTransitionName: `table-cell-${cell.id}`,
      }}
    >
      {cellEl}
    </TableCell>
  );
};

function DetailTableFull({
  rows,
}: {
  rows: DetailTableItem[];
  title: string;
}) {
  const showUserLabel = rows.length > 1;

  // Transform data
  const data = useMemo<DetailTableDataRow[]>(
    () => transformTableData(rows),
    [rows],
  );
  // Create columns
  const columns = useMemo(() => {
    const allHeadings = extractAllHeadings(rows);
    return createColumnsFromHeadings(allHeadings, showUserLabel);
  }, [rows, showUserLabel]);

  // Get available column IDs for validation
  const availableColumnIds = useMemo(
    () => new Set(columns.map((c) => c.id).filter(Boolean) as string[]),
    [columns],
  );

  // Calculate default sorting - only use columns that exist
  const sortbyDefault = useMemo(
    () => calculateDefaultSorting(rows, availableColumnIds),
    [rows, availableColumnIds],
  );

  // Calculate default grouping
  const defaultGrouping = useMemo(
    () => calculateDefaultGrouping(columns, showUserLabel),
    [columns, showUserLabel],
  );

  // Calculate column visibility
  const defaultColumnVisibility = useMemo(
    () => calculateDefaultColumnVisibility(columns),
    [columns],
  );

  // Use standard table hook with custom configuration
  const [sorting, setSorting] = useState<SortingState>(sortbyDefault);
  const [grouping, setGrouping] = useState<string[]>(defaultGrouping);
  const [columnVisibility, setColumnVisibility] =
    useState<VisibilityState>(defaultColumnVisibility);

  // Wrap state updates in startTransition for smooth animations
  const handleSortingChange = (updater: SortingState | ((old: SortingState) => SortingState)) => {
    startTransition(() => {
      setSorting(updater);
    });
  };

  const handleGroupingChange = (updater: string[] | ((old: string[]) => string[])) => {
    startTransition(() => {
      setGrouping(updater);
    });
  };

  const handleColumnVisibilityChange = (
    updater: VisibilityState | ((old: VisibilityState) => VisibilityState),
  ) => {
    startTransition(() => {
      setColumnVisibility(updater);
    });
  };

  // Helper function to extract the actual value from a leaf row
  // Leaf rows are not aggregated, so getValue should return the actual value
  const getOriginalValue = (
    leafRow: Row<DetailTableDataRow>,
    columnId: string,
  ): unknown => {
    if (!columnId || columnId === 'expander' || columnId === 'device') {
      return undefined;
    }

    try {
      // For leaf rows, getValue should return the actual value (not aggregated)
      return leafRow.getValue(columnId);
    } catch {
      return undefined;
    }
  };

  // Create a memoized function to check if rows can expand
  // This checks if leaf rows have different values
  const getRowCanExpandFn = useMemo(() => {
    return (row: Row<DetailTableDataRow>) => {
      const leafRows = row.getLeafRows();
      
      // If there's only one or zero leaf rows, no expansion needed
      if (leafRows.length <= 1) {
        return false;
      }

      // Get all visible columns (excluding the expander and device columns)
      const visibleColumns = columns.filter((col) => {
        const colId = col.id;
        if (!colId || colId === 'expander' || colId === 'device') return false;
        // Column is visible if visibility is not explicitly set to false
        return columnVisibility[colId] !== false;
      });

      // If no visible columns to compare, don't allow expansion
      if (visibleColumns.length === 0) {
        return false;
      }

      // Compare values across all visible columns using original data
      for (const column of visibleColumns) {
        const columnId = column.id;
        if (!columnId) continue;
        
        const values = leafRows.map((leafRow) => {
          try {
            const value = getOriginalValue(leafRow, columnId);
            // Normalize values for comparison (handle arrays, objects, etc.)
            if (value === undefined || value === null) {
              return null; // Normalize undefined and null to null for comparison
            }
            if (Array.isArray(value)) {
              return JSON.stringify(value);
            }
            if (typeof value === 'object') {
              return JSON.stringify(value);
            }
            return value;
          } catch {
            // If extraction fails, treat as null
            return null;
          }
        });

        // Check if all values are the same
        if (values.length === 0) continue;
        
        const firstValue = values[0];
        const allSame = values.every((val) => {
          // Handle null cases (normalized undefined/null)
          if (firstValue === null) {
            return val === null;
          }
          if (val === null) {
            return false;
          }
          // Deep equality check for objects/arrays (already stringified)
          if (typeof firstValue === 'string' && typeof val === 'string') {
            // Could be stringified objects/arrays, so compare directly
            return firstValue === val;
          }
          // Direct comparison for primitives
          return firstValue === val;
        });

        // If any column has different values, allow expansion
        if (!allSame) {
          return true;
        }
      }

      // All columns have the same values across all leaf rows
      return false;
    };
  }, [columns, columnVisibility]);

  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: handleSortingChange,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    onGroupingChange: handleGroupingChange,
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: getRowCanExpandFn,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    columnResizeMode: 'onChange',
    manualPagination: true,
    enableSorting: true,
    enableColumnFilters: true,
    enableColumnPinning: true,
    filterFns: {
      booleanFilterFn,
    },
    state: {
      sorting,
      grouping,
      columnVisibility,
      columnPinning: {
        left: ['expander'],
      },
    },
  });

  return (
    <div className="w-full overflow-x-auto">
      <Table className="w-full" style={{ width: '100%' }}>
        <DataTableHeader table={table} />
        <TableBody className="[&_tr:last-child]:border-(length:--border-width)">
          {table
            .getRowModel()
            .rows.map((row) => {
              const groupsList = table.getState().grouping;
              const parent = row.getParentRow();
              if (parent && !parent.getCanExpand()) {
                return null;
              }

              return (
                <Fragment key={row.id}>
                  <TableRow
                    className={clsx(
                      'border-x-(length:--border-width) bg-muted-foreground/10 transition-all duration-300 ease-in-out',
                    )}
                    style={
                      {
                        '--border-width': `${row.depth / 4}rem`,
                        backgroundColor: `hsl(var(--muted-foreground) / ${row.depth / 10})`,
                        viewTransitionName: `table-row-${row.id}`,
                      } as CSSProperties
                    }
                  >
                    {row
                      .getVisibleCells()
                      .map((cell) =>
                        renderTableCell(cell, row, groupsList),
                      )
                      .filter(Boolean)}
                  </TableRow>
                </Fragment>
              );
            })
            .filter(Boolean)}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Returns the column definition for the expand/collapse control column
 */
function getExpandingControlColumn() {
  return {
    id: 'expander',
    header: ExpandAll,
    cell: ExpandRow,
    aggregatedCell: ExpandRow,
    size: EXPANDER_COLUMN_SIZE,
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
