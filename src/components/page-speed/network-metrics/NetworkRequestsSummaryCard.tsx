"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RenderBytesValue } from "@/components/page-speed/lh-categories/table/RenderTableValue";

type NetworkRequestsSummary = {
  label: string;
  totalRequests: number;
  totalTransferSize: number;
  totalResourceSize: number;
};

type NetworkRequestsSummaryCardProps = {
  stats: NetworkRequestsSummary[];
};

export function NetworkRequestsSummaryCard({ stats }: NetworkRequestsSummaryCardProps) {
  const validStats = stats.filter(s => s.totalRequests > 0);
  if (!validStats.length) {
    return null;
  }

  const showReportColumn = validStats.length > 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Network Requests Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {showReportColumn && <TableHead>Report</TableHead>}
              <TableHead>Total Requests</TableHead>
              <TableHead>Transfer Size</TableHead>
              <TableHead>Resource Size</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {validStats.map(({ label, totalRequests, totalTransferSize, totalResourceSize }) => (
              <TableRow key={label}>
                {showReportColumn && <TableCell className="font-medium">{label || 'Unknown'}</TableCell>}
                <TableCell>{totalRequests}</TableCell>
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

