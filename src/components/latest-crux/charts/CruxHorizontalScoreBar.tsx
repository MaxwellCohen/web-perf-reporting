"use client";

import { cn } from "@/lib/utils";
import { CruxThreeSegmentMarkerBar } from "@/components/latest-crux/charts/CruxThreeSegmentMarkerBar";

/** CrUX-style horizontal score bar (not the PSI category score chart in PageSpeedGaugeChart). */
export function CruxHorizontalScoreBar({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const goodPercent = `10%`;
  const niPercent = `50%`;
  const poorPercent = `40%`;
  const markerPosition = score <= 1 ? `${(score / 1) * 100}% ` : `${score}% `;

  return (
    <CruxThreeSegmentMarkerBar
      wrapperClassName={cn("h-8 w-full", className)}
      segmentWidths={[poorPercent, niPercent, goodPercent]}
      segmentFills={["hsl(var(--chart-3))", "hsl(var(--chart-2))", "hsl(var(--chart-1))"]}
      markerPosition={markerPosition}
    />
  );
}
