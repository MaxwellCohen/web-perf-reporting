"use client";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { RenderBytesValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { CardWithTable } from "@/features/page-speed-insights/shared/CardWithTable";

type JavaScriptSummary = {
  label: string;
  totalScripts: number;
  totalTransferSize: number;
  totalResourceSize: number;
};

type JavaScriptSummaryCardProps = {
  stats: JavaScriptSummary[];
};

export function JavaScriptSummaryCard({ stats }: JavaScriptSummaryCardProps) {
  const validStats = stats.filter((s) => s.totalScripts > 0);

  if (!validStats.length) {
    return null;
  }

  const showReportColumn = validStats.length > 1;

  return (
    <CardWithTable
      title="JavaScript Summary"
      header={
        <TableRow>
          {showReportColumn && <TableHead>Report</TableHead>}
          <TableHead>Total Scripts</TableHead>
          <TableHead>Transfer Size</TableHead>
          <TableHead>Resource Size</TableHead>
        </TableRow>
      }
    >
      {validStats.map(({ label, totalScripts, totalTransferSize, totalResourceSize }) => (
        <TableRow key={label}>
          {showReportColumn && <TableCell className="font-medium">{label || "Unknown"}</TableCell>}
          <TableCell>{totalScripts}</TableCell>
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
