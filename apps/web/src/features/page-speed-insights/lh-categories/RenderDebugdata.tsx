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
import { useMemo } from "react";
import type { Cell, Row } from "@tanstack/react-table";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getGroupedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  RenderBytesValue,
  RenderCountNumber,
  renderTimeValue,
} from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import {
  LIGHTHOUSE_SUMMARY_METRIC_DEFS,
  type LighthouseSummaryMetricDebugFormat,
} from "@/features/page-speed-insights/lighthouseSummaryMetricDefinitions";
import { tanstackTableCellDataProps } from "@/features/page-speed-insights/shared/tanstackTableCellDataProps";

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
}: {
  cell: Cell<DebugDataTableItem, unknown>;
  row: Row<DebugDataTableItem>;
  rowSpan?: number;
}) {
  return (
    <TableCell
      {...(rowSpan != null ? { rowSpan } : {})}
      {...tanstackTableCellDataProps(cell, row)}
    >
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </TableCell>
  );
}

export function RenderDebugData({ items }: { items: TableDataItem[] }) {
  const data = useMemo(
    () =>
      items?.reduce((acc: Array<DebugDataTableItem>, i) => {
        const d = Object.entries(cleanDebugData(i.auditResult.details as DebugData)).map((i2) => {
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
      columnHelper.accessor("key", {
        id: "key",
        enableGrouping: true,
        header: "Item",
        cell: (props) => {
          const val = props.getValue();
          return RenderTitle(val);
        },
        aggregationFn: "unique",
      }),
      columnHelper.accessor("value", {
        header: "Value",
        aggregationFn: "unique", // unique values for each column
        cell: (props) => {
          const val = props.getValue();
          const key = props.row.getValue("key") as string;
          return renderItem(val, key);
        },
      }),
      columnHelper.accessor("label", {
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
      grouping: ["key"],
      columnPinning: {
        left: ["key", "value", "label"],
      },
    },
  });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => {
          return (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
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
                          />
                        );
                      }
                      return <DebugDataTableCell key={cell.id} cell={cell} row={sr} rowSpan={1} />;
                    })}
                  </TableRow>
                );
              })
              .filter(Boolean);
          }
          return (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <DebugDataTableCell key={cell.id} cell={cell} row={row} />
              ))}
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
    Object.fromEntries(Object.entries(data || {}).filter((v) => !["type", "items"].includes(v[0]))),
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
  time: renderTimeValue,
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

function renderItem(item: unknown, key: string) {
  const renderFn = TitleMap[key as keyof typeof TitleMap]?.renderFn;
  if (renderFn) {
    return renderFn(item);
  }

  if (typeof item === "string") {
    return item;
  }
  if (typeof item === "number") {
    return item.toFixed(2);
  }
  if (typeof item === "boolean") {
    return renderBoolean(item);
  }
  return "";
}

function RenderTitle(s: string) {
  return TitleMap[s as keyof typeof TitleMap]?.label || camelCaseToSentenceCase(s);
}
