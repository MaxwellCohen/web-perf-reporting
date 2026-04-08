"use client";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { RenderBytesValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { CardWithTable } from "@/features/page-speed-insights/shared/CardWithTable";

export type BytesCountSummaryRow = {
  label: string;
  count: number;
  totalTransferSize: number;
  totalResourceSize: number;
};

type BytesCountSummaryCardProps = {
  title: string;
  countColumnTitle: string;
  rows: BytesCountSummaryRow[];
};

export function BytesCountSummaryCard({ title, countColumnTitle, rows }: BytesCountSummaryCardProps) {
  const validStats = rows.filter((s) => s.count > 0);

  if (!validStats.length) {
    return null;
  }

  const showReportColumn = validStats.length > 1;

  return (
    <CardWithTable
      title={title}
      header={
        <TableRow>
          {showReportColumn && <TableHead>Report</TableHead>}
          <TableHead>{countColumnTitle}</TableHead>
          <TableHead>Transfer Size</TableHead>
          <TableHead>Resource Size</TableHead>
        </TableRow>
      }
    >
      {validStats.map(({ label, count, totalTransferSize, totalResourceSize }) => (
        <TableRow key={label}>
          {showReportColumn && <TableCell className="font-medium">{label || "Unknown"}</TableCell>}
          <TableCell>{count}</TableCell>
          <TableCell>
            <RenderBytesValue value={totalTransferSize} />
          </TableCell>
          <TableCell>
            <RenderBytesValue value={totalResourceSize} />
          </TableCell>
        </TableRow>
      ))}
    </CardWithTable>
  );
}
