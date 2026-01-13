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
import { RenderMSValue } from "@/components/page-speed/lh-categories/table/RenderTableValue";

type TimingMetrics = {
  label: string;
  ttfb?: number;
  ttfbCategory?: string;
  fcp?: number;
  fcpCategory?: string;
  lcp?: number;
  lcpCategory?: string;
  speedIndex?: number;
  totalBlockingTime?: number;
  domContentLoaded?: number;
  loadTime?: number;
  interactive?: number;
  observedNavigationStart?: number;
  observedFirstPaint?: number;
  observedFirstContentfulPaint?: number;
  observedLargestContentfulPaint?: number;
};

type TimingMetricsCardProps = {
  metrics: TimingMetrics[];
};

export function TimingMetricsCard({ metrics }: TimingMetricsCardProps) {
  const validMetrics = metrics.filter(m => m.ttfb !== undefined || m.fcp !== undefined || m.lcp !== undefined || 
    m.speedIndex !== undefined || m.totalBlockingTime !== undefined);
  
  if (!validMetrics.length) {
    return null;
  }

  const showReportColumn = validMetrics.length > 1;

  const renderValue = (value: number | undefined, category?: string) => {
    if (value === undefined) return <span className="text-muted-foreground">N/A</span>;
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="whitespace-nowrap">
          <RenderMSValue value={value} />
        </span>
        {category && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            category === 'FAST' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
            category === 'AVERAGE' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            {category}
          </span>
        )}
      </div>
    );
  };


  return (
    <Card className="md:col-span-2 lg:col-span-3">
      <CardHeader>
        <CardTitle>Page Load Timing Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="table-auto">
            <TableHeader>
              <TableRow>
                {showReportColumn && <TableHead className="min-w-20 whitespace-nowrap">Report</TableHead>}
                <TableHead className="min-w-25 whitespace-nowrap">TTFB</TableHead>
                <TableHead className="min-w-25 whitespace-nowrap">FCP</TableHead>
                <TableHead className="min-w-25 whitespace-nowrap">LCP</TableHead>
                <TableHead className="min-w-30 whitespace-nowrap">Speed Index</TableHead>
                <TableHead className="min-w-25 whitespace-nowrap">TBT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {validMetrics.map(({ 
                label, 
                ttfb, 
                ttfbCategory,
                fcp,
                fcpCategory,
                lcp,
                lcpCategory,
                speedIndex,
                totalBlockingTime
              }) => (
                <TableRow key={label}>
                  {showReportColumn && <TableCell className="font-medium min-w-20">{label || 'Unknown'}</TableCell>}
                  <TableCell className="min-w-25">{renderValue(ttfb, ttfbCategory)}</TableCell>
                  <TableCell className="min-w-25">{renderValue(fcp, fcpCategory)}</TableCell>
                  <TableCell className="min-w-25">{renderValue(lcp, lcpCategory)}</TableCell>
                  <TableCell className="min-w-30">{renderValue(speedIndex)}</TableCell>
                  <TableCell className="min-w-25">{renderValue(totalBlockingTime)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

