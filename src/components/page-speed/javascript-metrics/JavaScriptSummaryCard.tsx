"use client";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RenderBytesValue } from "../lh-categories/table/RenderTableValue";

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
  const validStats = stats.filter(s => s.totalScripts > 0);

  if (!validStats.length) {
    return null;
  }

  const showReportColumn = validStats.length > 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>JavaScript Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {showReportColumn && <TableHead>Report</TableHead>}
              <TableHead>Total Scripts</TableHead>
              <TableHead>Transfer Size</TableHead>
              <TableHead>Resource Size</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {validStats.map(({ label, totalScripts, totalTransferSize, totalResourceSize }) => (
              <TableRow key={label}>
                {showReportColumn && <TableCell className="font-medium">{label || 'Unknown'}</TableCell>}
                <TableCell>{totalScripts}</TableCell>
                <TableCell><RenderBytesValue value={totalTransferSize} /></TableCell>
                <TableCell><RenderBytesValue value={totalResourceSize} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

