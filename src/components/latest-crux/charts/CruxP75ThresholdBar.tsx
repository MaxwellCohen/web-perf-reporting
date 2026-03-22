'use client';

import { p75ThresholdSegments } from '@/components/latest-crux/lib/p75ThresholdSegments';
import type { CruxHistoryItem } from '@/lib/schema';

export function CruxP75ThresholdBar({
  histogramData,
}: {
  histogramData: CruxHistoryItem;
}) {
  const { goodPercent, niPercent, poorPercent, p75Location } =
    p75ThresholdSegments(histogramData);

  return (
    <div className="w-full overflow-hidden rounded-[4px]">
      <svg viewBox="0 0 100 7" className="m-auto w-[calc(100%-2px)]">
        <g className="flex flex-row">
          <rect width={goodPercent} height="10" fill="hsl(var(--chart-1))" />
          <rect
            width={niPercent}
            height="10"
            x={parseFloat(goodPercent) || 0}
            fill="hsl(var(--chart-2))"
          />
          <rect
            width={poorPercent}
            height="10"
            x={parseFloat(goodPercent) + parseFloat(niPercent) || 0}
            fill="hsl(var(--chart-3))"
          />
        </g>
        <g className="flex flex-row">
          <line
            x1={parseFloat(p75Location)}
            y1="0"
            x2={parseFloat(p75Location)}
            y2="10"
            stroke="currentColor"
            strokeWidth="1"
          />
          <line
            x1={parseFloat(p75Location)}
            y1="0"
            x2={parseFloat(p75Location)}
            y2="4"
            stroke="bg-primary"
            strokeWidth="1"
          />
        </g>
      </svg>
    </div>
  );
}
