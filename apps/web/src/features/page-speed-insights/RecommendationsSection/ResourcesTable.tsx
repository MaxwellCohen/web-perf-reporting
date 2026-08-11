"use client";
import { StockDataTable } from "@/features/page-speed-insights/tanstack-table-v9/StockDataTable";
import {
  useSimpleTable,
  type FlatColumnDef,
} from "@/features/page-speed-insights/tanstack-table-v9/useSimpleTable";
import { createStockColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";
import {
  createBytesColumn,
  createMSColumn,
  createPercentageColumn,
  createURLColumn,
} from "@/features/page-speed-insights/shared/tableColumnHelpers";

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

type ResourceTableRow = ResourceItem & { url: string };

interface ResourcesTableProps {
  items: ResourceItem[];
}

const columnHelper = createStockColumnHelper<ResourceTableRow>();
const positive = { requirePositive: true } as const;

const NUMERIC_SIZES = {
  wastedBytes: { size: 120, minSize: 80, maxSize: 200 },
  wastedMs: { size: 120, minSize: 80, maxSize: 200 },
  wastedPercent: { size: 100, minSize: 70, maxSize: 150 },
  totalBytes: { size: 120, minSize: 80, maxSize: 200 },
  scripting: { size: 130, minSize: 90, maxSize: 200 },
  scriptParseCompile: { size: 150, minSize: 100, maxSize: 200 },
  total: { size: 130, minSize: 90, maxSize: 200 },
} as const;

export function ResourcesTable({ items }: ResourcesTableProps) {
  const data: ResourceTableRow[] = items.map((item) => ({ ...item, url: item.url ?? "" }));

  const columns = [
    createURLColumn(columnHelper, {
      header: "Resource URL",
      size: 400,
      minSize: 200,
      maxSize: 800,
      emptyLabel: "Unattributable",
      enableGrouping: false,
    }),
    createBytesColumn(columnHelper, "wastedBytes", "Wasted Bytes", {
      ...positive,
      ...NUMERIC_SIZES.wastedBytes,
    }),
    createMSColumn(columnHelper, "wastedMs", "Wasted Time", {
      ...positive,
      ...NUMERIC_SIZES.wastedMs,
    }),
    createPercentageColumn(columnHelper, "wastedPercent", "Wasted %", {
      precision: 1,
      ...positive,
      ...NUMERIC_SIZES.wastedPercent,
    }),
    createBytesColumn(columnHelper, "totalBytes", "Total Size", {
      ...positive,
      ...NUMERIC_SIZES.totalBytes,
    }),
    createMSColumn(columnHelper, "scripting", "Scripting Time", {
      ...positive,
      ...NUMERIC_SIZES.scripting,
    }),
    createMSColumn(columnHelper, "scriptParseCompile", "Parse/Compile Time", {
      ...positive,
      ...NUMERIC_SIZES.scriptParseCompile,
    }),
    createMSColumn(columnHelper, "total", "Total CPU Time", {
      ...positive,
      ...NUMERIC_SIZES.total,
    }),
  ] as FlatColumnDef<ResourceTableRow>[];

  const table = useSimpleTable({ data, columns });

  return (
    <div className="w-full overflow-x-auto">
      <StockDataTable table={table} />
    </div>
  );
}
