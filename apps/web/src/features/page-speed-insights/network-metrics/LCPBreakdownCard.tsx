"use client";
import { useLcpBreakdownComputed } from "./useLcpBreakdownStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LCPBreakdownChart } from "./LCPBreakdownChart";
import { LCPBreakdownTable } from "./LCPBreakdownTable";

export function LCPBreakdownCard() {
  const breakdown = useLcpBreakdownComputed();

  if (!breakdown) {
    return null;
  }

  return (
    <Card className="md:col-span-2 lg:col-span-3">
      <CardHeader className="pb-3">
        <CardTitle>LCP Breakdown</CardTitle>
        <p className="text-sm text-muted-foreground">
          Time spent in each Largest Contentful Paint phase, stacked by report.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="relative z-10 min-h-40">
            <LCPBreakdownChart
              chartHeight={breakdown.chartHeight}
              chartData={breakdown.chartData}
              allSubparts={breakdown.allSubparts}
              subpartLabelBySubpart={breakdown.subpartLabelBySubpart}
            />
          </div>

          <div className="relative z-0 overflow-x-auto">
            <LCPBreakdownTable tableRows={breakdown.tableRows} reportLabels={breakdown.reportLabels} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
