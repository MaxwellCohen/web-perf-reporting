"use client";

import { cn } from "@/lib/utils";

type CruxThreeSegmentMarkerBarProps = {
  segmentWidths: readonly [string, string, string];
  segmentFills: readonly [string, string, string];
  markerPosition: string;
  svgClassName?: string;
  wrapperClassName?: string;
};

/** Shared 3-segment bar + vertical marker for CrUX-style histogram UIs. */
export function CruxThreeSegmentMarkerBar({
  segmentWidths: [w1, w2, w3],
  segmentFills: [f1, f2, f3],
  markerPosition,
  svgClassName,
  wrapperClassName,
}: CruxThreeSegmentMarkerBarProps) {
  const x2 = parseFloat(w1) || 0;
  const x3 = x2 + (parseFloat(w2) || 0);
  const mx = parseFloat(markerPosition);

  return (
    <div className={cn(wrapperClassName)}>
      <svg viewBox="0 0 100 7" className={svgClassName}>
        <g className="flex flex-row">
          <rect width={w1} height="10" fill={f1} />
          <rect width={w2} height="10" x={x2} fill={f2} />
          <rect width={w3} height="10" x={x3} fill={f3} />
        </g>
        <g className="flex flex-row">
          <line x1={mx} y1="0" x2={mx} y2="10" stroke="currentColor" strokeWidth="1" />
          <line x1={mx} y1="0" x2={mx} y2="4" stroke="bg-primary" strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
}
