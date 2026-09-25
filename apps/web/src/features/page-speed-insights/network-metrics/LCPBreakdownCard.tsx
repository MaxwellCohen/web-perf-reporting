"use client";
import { TriangleAlert } from "lucide-react";
import { usePageSpeedSelector } from "@/features/page-speed-insights/PageSpeedContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LCPBreakdownChart } from "./LCPBreakdownChart";
import { LCPBreakdownTable } from "./LCPBreakdownTable";
import { selectPossibleLcpRemountMatches } from "./possibleLcpRemount";
import { useLcpBreakdownComputed } from "./useLcpBreakdownStore";

export function LCPBreakdownCard() {
  const breakdown = useLcpBreakdownComputed();
  const remountMatches = usePageSpeedSelector(selectPossibleLcpRemountMatches);

  if (!breakdown) {
    return null;
  }

  const remountLabels = remountMatches.map((match) => match.label).join(", ");

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
          {remountMatches.length > 0 ? (
            <Alert className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              <TriangleAlert className="h-4 w-4" />
              <AlertTitle>Possible LCP remount</AlertTitle>
              <AlertDescription>
                {remountLabels}: text LCP, mostly element render delay, and observed LCP well after
                FCP. This can happen when hydration replaces DOM and Chrome re-records LCP — confirm
                with a performance trace (`largestContentfulPaint::Candidate` events).
              </AlertDescription>
            </Alert>
          ) : null}

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
