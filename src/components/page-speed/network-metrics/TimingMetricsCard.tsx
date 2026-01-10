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
  inp?: number;
  inpCategory?: string;
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
    m.speedIndex !== undefined || m.totalBlockingTime !== undefined ||
    m.domContentLoaded !== undefined || m.loadTime !== undefined || m.interactive !== undefined);
  
  if (!validMetrics.length) {
    return null;
  }

  const showReportColumn = validMetrics.length > 1;

  const renderValue = (value: number | undefined, category?: string) => {
    if (value === undefined) return <span className="text-muted-foreground">N/A</span>;
    return (
      <div className="flex items-center gap-2">
        <RenderMSValue value={value} />
        {category && (
          <span className={`text-xs px-2 py-0.5 rounded ${
            category === 'FAST' ? 'bg-green-100 text-green-800' :
            category === 'AVERAGE' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
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
          <Table>
            <TableHeader>
              <TableRow>
                {showReportColumn && <TableHead>Report</TableHead>}
                <TableHead>TTFB</TableHead>
                <TableHead>FCP</TableHead>
                <TableHead>LCP</TableHead>
                <TableHead>INP</TableHead>
                <TableHead>Speed Index</TableHead>
                <TableHead>TBT</TableHead>
                <TableHead>DOM Content Loaded</TableHead>
                <TableHead>Load Time</TableHead>
                <TableHead>Time to Interactive</TableHead>
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
                inp,
                inpCategory,
                speedIndex,
                totalBlockingTime,
                domContentLoaded,
                loadTime,
                interactive
              }) => (
                <TableRow key={label}>
                  {showReportColumn && <TableCell className="font-medium">{label || 'Unknown'}</TableCell>}
                  <TableCell>{renderValue(ttfb, ttfbCategory)}</TableCell>
                  <TableCell>{renderValue(fcp, fcpCategory)}</TableCell>
                  <TableCell>{renderValue(lcp, lcpCategory)}</TableCell>
                  <TableCell>{renderValue(inp, inpCategory)}</TableCell>
                  <TableCell>{renderValue(speedIndex)}</TableCell>
                  <TableCell>{renderValue(totalBlockingTime)}</TableCell>
                  <TableCell>{renderValue(domContentLoaded)}</TableCell>
                  <TableCell>{renderValue(loadTime)}</TableCell>
                  <TableCell>{renderValue(interactive)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

