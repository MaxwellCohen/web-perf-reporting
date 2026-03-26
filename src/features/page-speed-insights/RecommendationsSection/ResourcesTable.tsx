"use client";
import { useMemo } from "react";
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

export function ResourcesTable({ items }: ResourcesTableProps) {
  "use no memo";

  const columns = useMemo<ColumnDef<ResourceItem>[]>(() => {
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
      {
        id: "wastedBytes",
        accessorKey: "wastedBytes",
        header: "Wasted Bytes",
        size: 120,
        minSize: 80,
        maxSize: 200,
        enableResizing: true,
        filterFn: "inNumberRange",
        cell: ({ row }) => {
          const value = row.original.wastedBytes;
          return value !== undefined && value > 0 ? (
            <RenderBytesValue value={value} />
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: "wastedMs",
        accessorKey: "wastedMs",
        header: "Wasted Time",
        size: 120,
        minSize: 80,
        maxSize: 200,
        enableResizing: true,
        filterFn: "inNumberRange",
        cell: ({ row }) => {
          const value = row.original.wastedMs;
          return value !== undefined && value > 0 ? (
            <RenderMSValue value={value} />
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: "wastedPercent",
        accessorKey: "wastedPercent",
        header: "Wasted %",
        size: 100,
        minSize: 70,
        maxSize: 150,
        enableResizing: true,
        filterFn: "inNumberRange",
        cell: ({ row }) => {
          const value = row.original.wastedPercent;
          return value !== undefined && value > 0 ? (
            <span>{value.toFixed(1)}%</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: "totalBytes",
        accessorKey: "totalBytes",
        header: "Total Size",
        size: 120,
        minSize: 80,
        maxSize: 200,
        enableResizing: true,
        filterFn: "inNumberRange",
        cell: ({ row }) => {
          const value = row.original.totalBytes;
          return value !== undefined && value > 0 ? (
            <RenderBytesValue value={value} />
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: "scripting",
        accessorKey: "scripting",
        header: "Scripting Time",
        size: 130,
        minSize: 90,
        maxSize: 200,
        enableResizing: true,
        filterFn: "inNumberRange",
        cell: ({ row }) => {
          const value = row.original.scripting;
          return value !== undefined && value > 0 ? (
            <RenderMSValue value={value} />
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: "scriptParseCompile",
        accessorKey: "scriptParseCompile",
        header: "Parse/Compile Time",
        size: 150,
        minSize: 100,
        maxSize: 200,
        enableResizing: true,
        filterFn: "inNumberRange",
        cell: ({ row }) => {
          const value = row.original.scriptParseCompile;
          return value !== undefined && value > 0 ? (
            <RenderMSValue value={value} />
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: "total",
        accessorKey: "total",
        header: "Total CPU Time",
        size: 130,
        minSize: 90,
        maxSize: 200,
        enableResizing: true,
        filterFn: "inNumberRange",
        cell: ({ row }) => {
          const value = row.original.total;
          return value !== undefined && value > 0 ? (
            <RenderMSValue value={value} />
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
        enableSorting: true,
        enableColumnFilter: true,
      },
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
