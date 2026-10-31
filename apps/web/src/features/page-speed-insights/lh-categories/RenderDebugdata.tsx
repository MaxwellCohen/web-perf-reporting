import type {
  StockCell,
  StockColumnDef,
  StockRow,
} from "@/features/page-speed-insights/shared/tanstackStockTypes";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DebugData } from "@/lib/schema";
import { renderBoolean } from "@/features/page-speed-insights/lh-categories/renderBoolean";
import { camelCaseToSentenceCase } from "@/features/page-speed-insights/lh-categories/camelCaseToSentenceCase";
import { TableDataItem } from "@/features/page-speed-insights/tsTable/TableDataItem";
import { AuditDebugViz } from "@/features/page-speed-insights/audit-viz/AuditDebugViz";
import { flexRender, useTable } from "@tanstack/react-table";
import { createStockColumnHelper as createColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";
import { debugDataTableFeatures } from "@/features/page-speed-insights/tanstack-table-v9/features";
import {
  RenderBytesValue,
  RenderCountNumber,
} from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import {
  LIGHTHOUSE_SUMMARY_METRIC_DEFS,
  type LighthouseSummaryMetricDebugFormat,
} from "@/features/page-speed-insights/lighthouseSummaryMetricDefinitions";
import { tanstackTableCellDataProps } from "@/features/page-speed-insights/shared/tanstackTableCellDataProps";
import { CopyTableButton } from "@/features/page-speed-insights/tanstack-table-v9/CopyTableButton";
import { TableWithCopyToolbar } from "@/features/page-speed-insights/tanstack-table-v9/TableWithCopyToolbar";
import { ColumnResizer } from "@/features/page-speed-insights/tanstack-table-v9/columnResizer";
import { useFullWidthTables } from "@/features/page-speed-insights/tanstack-table-v9/fullWidthTables";
import { cn } from "@/lib/utils";

type DebugDataTableItem = {
  key: string;
  value: unknown;
  label: string;
};

const columnHelper = createColumnHelper<DebugDataTableItem>();

function DebugDataTableCell({
  cell,
  row,
  rowSpan,
  fillWidth,
}: {
  cell: StockCell<DebugDataTableItem, unknown>;
  row: StockRow<DebugDataTableItem>;
  rowSpan?: number;
  fillWidth: boolean;
}) {
  const size = cell.column.getSize();
  return (
    <TableCell
      {...(rowSpan != null ? { rowSpan } : {})}
      style={
        fillWidth
          ? { width: `${size}px`, minWidth: `${size}px` }
          : { width: `${size}px`, minWidth: `${size}px`, maxWidth: `${size}px` }
      }
      {...tanstackTableCellDataProps(cell, row)}
    >
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </TableCell>
  );
}

function EmptyDebugDataTable() {
  return (
    <TableWithCopyToolbar>
      {({ tableRef }) => (
        <Table ref={tableRef}>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody />
        </Table>
      )}
    </TableWithCopyToolbar>
  );
}

export function RenderDebugData({ items }: { items: TableDataItem[] }) {
  if (!items.length) {
    return <EmptyDebugDataTable />;
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      <AuditDebugViz items={items} />
      <RenderDebugDataTable items={items} />
    </div>
  );
}

function RenderDebugDataTable({ items }: { items: TableDataItem[] }) {
  const fillWidth = useFullWidthTables();
  const data = items?.reduce((acc: Array<DebugDataTableItem>, i) => {
    const d = Object.entries(cleanDebugData(i.auditResult.details as DebugData)).map((i2) => {
      return {
        key: i2[0],
        value: i2[1],
        label: i._userLabel,
      };
    });
    return [...acc, ...d];
  }, []);

  const columns = [
    columnHelper.accessor("key", {
      id: "key",
      enableGrouping: true,
      enableResizing: true,
      size: 220,
      minSize: 120,
      header: "Item",
      cell: (props) => {
        const val = props.getValue();
        return RenderTitle(val);
      },
      aggregationFn: "unique",
    }),
    columnHelper.accessor("value", {
      id: "value",
      enableResizing: true,
      size: 180,
      minSize: 100,
      header: "Value",
      aggregationFn: "unique", // unique values for each column
      cell: (props) => {
        const val = props.getValue();
        const key = props.row.getValue("key") as string;
        return renderItem(val, key);
      },
    }),
    columnHelper.accessor("label", {
      id: "label",
      header: "Report",
      enableGrouping: true,
      enableResizing: true,
      size: 140,
      minSize: 80,
    }),
  ];
  const table = useTable({
    features: debugDataTableFeatures,
    data,
    columns: columns as StockColumnDef<DebugDataTableItem>[],
    manualPagination: true,
    enableColumnPinning: true,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    initialState: {
      grouping: ["key"],
      columnPinning: {
        end: [],
        start: ["key", "value", "label"],
      },
    },
  });

  const tableWidth = table.getTotalSize();

  return (
    <div className="w-full min-w-0">
      <div className="mb-2 flex justify-end">
        <CopyTableButton table={table} />
      </div>
      <Table
        style={{
          width: fillWidth ? "100%" : tableWidth,
          ...(fillWidth ? { minWidth: tableWidth } : {}),
        }}
        className={cn(fillWidth ? "min-w-full" : "w-max!")}
        wrapperClassName="min-w-0"
      >
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => {
            return (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const size = header.getSize();
                  return (
                    <TableHead
                      key={header.id}
                      className="relative overflow-hidden"
                      style={
                        fillWidth
                          ? { width: `${size}px`, minWidth: `${size}px` }
                          : {
                              width: `${size}px`,
                              minWidth: `${size}px`,
                              maxWidth: `${size}px`,
                            }
                      }
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <ColumnResizer header={header} />
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
                        if (cell.id.includes("key")) {
                          if (i !== 0) {
                            return null;
                          }
                          return (
                            <DebugDataTableCell
                              key={cell.id}
                              cell={cell}
                              row={sr}
                              rowSpan={row.subRows.length}
                              fillWidth={fillWidth}
                            />
                          );
                        }
                        return (
                          <DebugDataTableCell
                            key={cell.id}
                            cell={cell}
                            row={sr}
                            rowSpan={1}
                            fillWidth={fillWidth}
                          />
                        );
                      })}
                    </TableRow>
                  );
                })
                .filter(Boolean);
            }
            return (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <DebugDataTableCell
                    key={cell.id}
                    cell={cell}
                    row={row}
                    fillWidth={fillWidth}
                  />
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function cleanDebugData(data: DebugData | undefined) {
  if (!data) {
    return {};
  }
  const merged = [
    Object.fromEntries(Object.entries(data || {}).filter((v) => !["type", "items"].includes(v[0]))),
    ...(data?.items || []),
  ].reduce(
    (acc: Record<string, unknown>, i: Record<string, unknown>) => ({
      ...acc,
      ...i,
    }),
    {},
  );
  return flattenDebugData(merged);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Nested objects (e.g. CLS `newEngineResult`) become `parent.child` rows instead of blank cells. */
function flattenDebugData(data: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  return Object.entries(data).reduce((acc: Record<string, unknown>, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value)) {
      return { ...acc, ...flattenDebugData(value, path) };
    }
    return { ...acc, [path]: value };
  }, {});
}

const renderBytesValue = (v: unknown) => <RenderBytesValue value={v} />;
const renderTSValue = RenderCountNumber;

type DebugTitleMeta = {
  label: string;
  sortOrder: number;
  renderFn?: (v: unknown) => unknown;
};

function debugTitle(
  label: string,
  sortOrder: number,
  renderFn?: (v: unknown) => unknown,
): DebugTitleMeta {
  return renderFn ? { label, sortOrder, renderFn } : { label, sortOrder };
}

const DEBUG_TITLE_FORMATTERS: Record<
  LighthouseSummaryMetricDebugFormat,
  ((v: unknown) => unknown) | undefined
> = {
  plain: undefined,
  time: (value: unknown) => formatMs(Number(value)),
  bytes: renderBytesValue,
  count: RenderCountNumber,
  ts: renderTSValue,
};

const TitleMap: Record<string, DebugTitleMeta> = Object.fromEntries(
  LIGHTHOUSE_SUMMARY_METRIC_DEFS.map((def, i) => {
    const sortOrder = i + 1;
    const renderFn = DEBUG_TITLE_FORMATTERS[def.debugFormat];
    return [
      def.id,
      renderFn ? debugTitle(def.label, sortOrder, renderFn) : debugTitle(def.label, sortOrder),
    ];
  }),
);

function lastKeySegment(key: string) {
  return key.split(".").pop() || key;
}

/** Keeps small values readable: 0.0000156 stays 0.0000156 instead of 0.00. */
function formatDebugNumber(value: number) {
  if (Number.isInteger(value)) return String(value);
  if (Math.abs(value) >= 1) return value.toFixed(2);
  return String(Number(value.toPrecision(3)));
}

function renderItem(item: unknown, key: string) {
  const renderFn = TitleMap[lastKeySegment(key) as keyof typeof TitleMap]?.renderFn;
  if (renderFn) {
    return renderFn(item);
  }

  if (typeof item === "string") {
    return item;
  }
  if (typeof item === "number") {
    return formatDebugNumber(item);
  }
  if (typeof item === "boolean") {
    return renderBoolean(item);
  }
  if (item == null) {
    return "";
  }
  return JSON.stringify(item);
}

function RenderTitle(s: string) {
  return s
    .split(".")
    .map((part) => TitleMap[part as keyof typeof TitleMap]?.label || camelCaseToSentenceCase(part))
    .join(" › ");
}
