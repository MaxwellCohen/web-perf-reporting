import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AuditResult } from '@/lib/schema';

export function RenderMetricSavings({
  mobileAuditData,
  desktopAuditData,
}: {
  mobileAuditData: AuditResult[string];
  desktopAuditData: AuditResult[string];
}) {
  if (!mobileAuditData.metricSavings && !desktopAuditData.metricSavings) {
    return null;
  }

  const keys = [
    ...new Set([
      ...Object.keys(mobileAuditData?.metricSavings || {}),
      ...Object.keys(desktopAuditData?.metricSavings || {}),
    ]),
  ];

  const mobileTotalSavings = Object.values(
    mobileAuditData?.metricSavings || {},
  ).reduce((acc, savings) => acc + savings, 0);
  const desktopTotalSavings = Object.values(
    desktopAuditData?.metricSavings || {},
  ).reduce((acc, savings) => acc + savings, 0);
  if (mobileTotalSavings === 0 && desktopTotalSavings === 0) {
    return null;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Metric</TableHead>
          <TableHead>Mobile Possible Savings</TableHead>
          <TableHead>Desktop Possible Savings</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {keys.map((metric) => (
          <TableRow key={metric}>
            <TableCell>{metric}</TableCell>
            <TableCell>
              {mobileAuditData?.metricSavings?.[metric] || 0}
            </TableCell>
            <TableCell>
              {desktopAuditData?.metricSavings?.[metric] || 0}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>  
  );
}
