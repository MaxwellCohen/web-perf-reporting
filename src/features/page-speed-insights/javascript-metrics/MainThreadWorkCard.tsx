"use client";

import type { TableItem } from "@/lib/schema";
import * as PT from "@/features/page-speed-insights/shared/psiTableToolkit";

type MainThreadWorkData = {
  label: string;
  mainThreadWork: TableItem[];
};

type MainThreadWorkTableRow = {
  label: string;
  group: string;
  groupLabel: string;
  duration: number | undefined;
};

type MainThreadWorkCardProps = {
  metrics: MainThreadWorkData[];
};

const columnHelper = PT.createColumnHelper<MainThreadWorkTableRow>();
const cols: PT.ColumnDef<MainThreadWorkTableRow, any>[] = [
  columnHelper.accessor("groupLabel", {
    id: "groupLabel",
    header: "Category",
    enableSorting: true,
    enableGrouping: true,
    enableResizing: true,
    filterFn: "includesString",
    aggregationFn: "unique",
    cell: (info) => info.getValue(),
    aggregatedCell: PT.createStringAggregatedCell("groupLabel", undefined, false),
  }),
  PT.createMSColumn(columnHelper, "duration", "Time Spent"),
];

export function MainThreadWorkCard({ metrics }: MainThreadWorkCardProps) {
  "use no memo";
  const validMetrics = PT.useMemo(() => metrics.filter((m) => m.mainThreadWork.length > 0), [metrics]);
  const showReportColumn = validMetrics.length > 1;

  const data = PT.useMemo<MainThreadWorkTableRow[]>(() => {
    const allRows = validMetrics.flatMap(({ label, mainThreadWork }) =>
      mainThreadWork.map((item: TableItem) => {
        const group = typeof item.group === "string" ? item.group : "";
        const groupLabel = typeof item.groupLabel === "string" ? item.groupLabel : group;
        const duration = PT.getNumber(item.duration);
        return {
          label,
          group,
          groupLabel: groupLabel || PT.toTitleCase(group),
          duration,
        };
      }),
    );

    return PT.sortByMaxValue(
      allRows,
      (row) => row.groupLabel,
      (row) => row.duration || 0,
      validMetrics.length,
    );
  }, [validMetrics]);

  const columns = PT.useTableColumns<MainThreadWorkTableRow>(cols, columnHelper, showReportColumn);

  const table = PT.useStandardTable({
    data,
    columns,
    grouping: ["groupLabel"],
  });

  if (!validMetrics.length) {
    return null;
  }

  return <PT.TableCard title="Main Thread Work Breakdown" table={table} />;
}
