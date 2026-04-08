"use client";
import { ReactNode, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Table } from "@/components/ui/table";
import { DataTableHeader } from "@/features/page-speed-insights/lh-categories/table/DataTableHeader";
import { DataTableBody } from "@/features/page-speed-insights/lh-categories/table/DataTableBody";
import {
  RenderBytesValue,
  RenderMSValue,
} from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { useSimpleTable } from "@/features/page-speed-insights/shared/useSimpleTable";

interface ResourceItem {
  url?: string;
  wastedBytes?: number;
  wastedMs?: number;
  totalBytes?: number;
  wastedPercent?: number;
  total?: number;
  scripting?: number;
  scriptParseCompile?: number;
  [key: string]: unknown;
}

interface ResourcesTableProps {
  items: ResourceItem[];
}

function emptyNumberCell(): ReactNode {
  return <span className="text-muted-foreground">—</span>;
}

function positiveNumberCell(
  value: number | undefined,
  render: (v: number) => ReactNode,
): ReactNode {
  return value !== undefined && value > 0 ? render(value) : emptyNumberCell();
}

function resourceNumericColumn(
  id: keyof ResourceItem & string,
  header: string,
  sizes: { size: number; minSize: number; maxSize: number },
  getCell: (row: ResourceItem) => ReactNode,
): ColumnDef<ResourceItem> {
  return {
    id,
    accessorKey: id,
    header,
    size: sizes.size,
    minSize: sizes.minSize,
    maxSize: sizes.maxSize,
    enableResizing: true,
    filterFn: "inNumberRange",
    cell: ({ row }) => getCell(row.original),
    enableSorting: true,
    enableColumnFilter: true,
  };
}

function bytesCell(get: (row: ResourceItem) => number | undefined) {
  return (row: ResourceItem) =>
    positiveNumberCell(get(row), (v) => <RenderBytesValue value={v} />);
}

function msCell(get: (row: ResourceItem) => number | undefined) {
  return (row: ResourceItem) => positiveNumberCell(get(row), (v) => <RenderMSValue value={v} />);
}

export function ResourcesTable({ items }: ResourcesTableProps) {
  "use no memo";

  const columns = useMemo<ColumnDef<ResourceItem>[]>(() => {
    const numericColumns: Array<{
      id: keyof ResourceItem & string;
      header: string;
      sizes: { size: number; minSize: number; maxSize: number };
      cell: (row: ResourceItem) => ReactNode;
    }> = [
      {
        id: "wastedBytes",
        header: "Wasted Bytes",
        sizes: { size: 120, minSize: 80, maxSize: 200 },
        cell: bytesCell((r) => r.wastedBytes),
      },
      {
        id: "wastedMs",
        header: "Wasted Time",
        sizes: { size: 120, minSize: 80, maxSize: 200 },
        cell: msCell((r) => r.wastedMs),
      },
      {
        id: "wastedPercent",
        header: "Wasted %",
        sizes: { size: 100, minSize: 70, maxSize: 150 },
        cell: (row) =>
          positiveNumberCell(row.wastedPercent, (v) => <span>{v.toFixed(1)}%</span>),
      },
      {
        id: "totalBytes",
        header: "Total Size",
        sizes: { size: 120, minSize: 80, maxSize: 200 },
        cell: bytesCell((r) => r.totalBytes),
      },
      {
        id: "scripting",
        header: "Scripting Time",
        sizes: { size: 130, minSize: 90, maxSize: 200 },
        cell: msCell((r) => r.scripting),
      },
      {
        id: "scriptParseCompile",
        header: "Parse/Compile Time",
        sizes: { size: 150, minSize: 100, maxSize: 200 },
        cell: msCell((r) => r.scriptParseCompile),
      },
      {
        id: "total",
        header: "Total CPU Time",
        sizes: { size: 130, minSize: 90, maxSize: 200 },
        cell: msCell((r) => r.total),
      },
    ];

    return [
      {
        id: "url",
        accessorKey: "url",
        header: "Resource URL",
        size: 400,
        minSize: 200,
        maxSize: 800,
        enableResizing: true,
        filterFn: "includesString",
        cell: ({ row }) => {
          const url = row.original.url;
          if (url && url !== "Unattributable") {
            return (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline break-all"
              >
                {url}
              </a>
            );
          }
          return <span className="text-muted-foreground">Unattributable</span>;
        },
        enableSorting: true,
        enableColumnFilter: true,
      },
      ...numericColumns.map(({ id, header, sizes, cell }) =>
        resourceNumericColumn(id, header, sizes, cell),
      ),
    ];
  }, []);

  const table = useSimpleTable({ data: items, columns });

  return (
    <div className="w-full overflow-x-auto">
      <Table className="w-full">
        <DataTableHeader table={table} />
        <DataTableBody table={table} />
      </Table>
    </div>
  );
}
