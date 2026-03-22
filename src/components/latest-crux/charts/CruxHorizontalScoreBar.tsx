'use client';

import { cn } from '@/lib/utils';

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
  const Marker = score <= 1 ? `${(score / 1) * 100}% ` : `${score}% `;

  return (
    <div className={cn('h-8 w-full', className)}>
      <svg viewBox="0 0 100 7">
        <g className="flex flex-row">
          <rect width={poorPercent} height="10" fill="hsl(var(--chart-3))" />
          <rect
            width={niPercent}
            height="10"
            x={parseFloat(poorPercent) || 0}
            fill="hsl(var(--chart-2))"
          />
          <rect
            width={goodPercent}
            height="10"
            x={parseFloat(niPercent) + parseFloat(poorPercent) || 0}
            fill="hsl(var(--chart-1))"
          />
        </g>
        <g className="flex flex-row">
          <line
            x1={parseFloat(Marker)}
            y1="0"
            x2={parseFloat(Marker)}
            y2="10"
            stroke="currentColor"
            strokeWidth="1"
          />
          <line
            x1={parseFloat(Marker)}
            y1="0"
            x2={parseFloat(Marker)}
            y2="4"
            stroke="bg-primary"
            strokeWidth="1"
          />
        </g>
      </svg>
    </div>
  );
}
