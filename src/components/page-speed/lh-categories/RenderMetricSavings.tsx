import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AuditResult } from "@/lib/schema";


export function RenderMetricSavings({
    auditData,
  }: {
    auditData: AuditResult[string];
  }) {
    if (!auditData.metricSavings) {
      return null;
    }
  
    const totalSavings = Object.values(auditData.metricSavings).reduce(
      (acc, savings) => acc + savings,
      0,
    );
    if (totalSavings === 0) {
      return null;
    }
  
    return (
      <div className="grid grid-cols-[auto_1fr] gap-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead>Possible Savings</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(auditData.metricSavings).map(([metric, savings]) => (
              <TableRow key={metric}>
                <TableCell>{metric}</TableCell>
                <TableCell>{savings}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
  