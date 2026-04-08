"use client";

import { p75ThresholdSegments } from "@/components/latest-crux/lib/p75ThresholdSegments";
import { CruxThreeSegmentMarkerBar } from "@/components/latest-crux/charts/CruxThreeSegmentMarkerBar";
import type { CruxHistoryItem } from "@/lib/schema";

export function CruxP75ThresholdBar({ histogramData }: { histogramData: CruxHistoryItem }) {
  const { goodPercent, niPercent, poorPercent, p75Location } = p75ThresholdSegments(histogramData);

  return (
    <CruxThreeSegmentMarkerBar
      wrapperClassName="w-full overflow-hidden rounded-[4px]"
      svgClassName="m-auto w-[calc(100%-2px)]"
      segmentWidths={[goodPercent, niPercent, poorPercent]}
      segmentFills={["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"]}
      markerPosition={p75Location}
    />
  );
}
