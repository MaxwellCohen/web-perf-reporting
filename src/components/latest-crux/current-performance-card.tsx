"use client";

import { Card } from "@/components/ui/card";
import { CruxP75ThresholdBar } from "@/components/latest-crux/charts/CruxP75ThresholdBar";
import { ChartMap } from "@/components/latest-crux/chartMap";
import { CurrentPerformanceChartContext } from "@/components/latest-crux/context/CurrentPerformanceChartContext";
import { p75StatusFromHistogram } from "@/components/latest-crux/lib/p75StatusFromHistogram";
import type { CruxHistoryItem } from "@/lib/schema";
import { useContext, useMemo } from "react";

export function CurrentPerformanceCard({
  histogramData,
  title,
}: {
  histogramData?: CruxHistoryItem;
  title: string;
}) {
  const ChartType = useContext(CurrentPerformanceChartContext);

  const extraInfo = useMemo(
    () => [
      `Good: 0 to ${histogramData?.good_max ?? 0}`,
      `Needs Improvement: ${histogramData?.good_max ?? 0} to ${histogramData?.ni_max ?? 0}`,
      `Poor: ${histogramData?.ni_max ?? 0} and above`,
    ],
    [histogramData],
  );

  const Chart = ChartMap[ChartType] ?? ChartMap.Histogram;

  if (!histogramData) {
    return null;
  }

  return (
    <Card className="grid h-full grid-cols-1 grid-rows-[2.75rem,auto,1rem,auto] gap-1 p-2">
      <div className="text-md overflow-hidden text-center font-bold">{title}</div>
      <Chart histogramData={histogramData} />
      <CruxP75ThresholdBar histogramData={histogramData} />
      <div className="mt-1 flex-col items-start text-sm">
        <div className="flex gap-2 font-medium leading-none">
          P75 is {histogramData.P75 ?? "N/A"}
        </div>
        <div className="flex gap-2 font-medium leading-none">
          <P75StatusLabel histogramData={histogramData} />
        </div>
        {extraInfo.map((info, idx) => (
          <div className="text-xs leading-none text-muted-foreground" key={`${idx}-${info}`}>
            {info}
          </div>
        ))}
      </div>
    </Card>
  );
}

function P75StatusLabel({ histogramData }: { histogramData: CruxHistoryItem }) {
  const status = p75StatusFromHistogram(histogramData);
  return <span style={{ color: status.color }}>{status.label}</span>;
}
