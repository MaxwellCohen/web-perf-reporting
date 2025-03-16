import { Details } from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AuditResultsRecord } from '@/lib/schema';

export function RenderMetricSavings({
  mobileAuditData,
  desktopAuditData,
}: {
  mobileAuditData: AuditResultsRecord[string];
  desktopAuditData: AuditResultsRecord[string];
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
    <Details>
      <summary className="flex flex-col gap-2">
        <h4 className="text-md font-bold">CWV Possible Metric Savings</h4>
      </summary>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Metric</TableHead>
            <TableHead>Possible Mobile Savings</TableHead>
            <TableHead>Possible Desktop Savings</TableHead>
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
    </Details>
  );
}
