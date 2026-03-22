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
  auditData,
  labels,
}: {
  auditData?: (AuditResultsRecord[string] | null)[];

  labels: string[];
}) {
  const metricSavings =
    auditData
      ?.map((a, i) => ({ metricSavings: a?.metricSavings, label: labels[i] }))
      .filter((a) => a.metricSavings) || [];

  if (!metricSavings.length) {
    return null;
  }

  const keys = [
    ...new Set(
      metricSavings?.reduce(
        (acc: string[], a) => [...acc, ...Object.keys(a.metricSavings || {})],
        [],
      ),
    ),
  ];

  return (
    <Details>
      <summary className="flex flex-col gap-2">
        <h4 className="text-md font-bold">Possible Metric Savings</h4>
      </summary>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Metric</TableHead>
            {metricSavings.map((ms, i) => (
              <TableHead key={`${i}_${ms.label}`}>
                Possible {ms.label || ''} Savings
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.map((metric) => (
            <TableRow key={metric}>
              <TableCell>{metric}</TableCell>
              {metricSavings.map((ms, i) => (
                <TableCell key={`${i}_${ms.label}`}>
                  {ms?.metricSavings?.[metric] ?? 0}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Details>
  );
}
