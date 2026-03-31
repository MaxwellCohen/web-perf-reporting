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
      <CardHeader>
        <CardTitle>LCP Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Chart Visualization */}
          <div className="relative z-10">
            <LCPBreakdownChart
              chartHeight={breakdown.chartHeight}
              chartData={breakdown.chartData}
              allSubparts={breakdown.allSubparts}
              subpartLabelBySubpart={breakdown.subpartLabelBySubpart}
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto relative z-0">
            <LCPBreakdownTable tableRows={breakdown.tableRows} reportLabels={breakdown.reportLabels} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
