"use client";

import type { ReactNode } from "react";
import { MomentRow } from "./MomentRow";
import type { PageLoadTimeline } from "./types";

export function VerticalTimeline({
  axisEndMs,
  children,
}: {
  axisEndMs: number;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4" data-axis-end-ms={axisEndMs}>
      {children}
    </div>
  );
}

export function TimelineMoments({
  timeline,
  deviceLabel,
  idPrefix,
}: {
  timeline: PageLoadTimeline;
  deviceLabel: string;
  idPrefix?: string;
}) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute bottom-4 left-[2.375rem] top-2 w-px -translate-x-1/2 bg-border sm:left-[2.875rem]"
      />

      <ol className="relative m-0 list-none p-0">
        {timeline.events.map((moment) => (
          <MomentRow
            key={`${moment.phaseId}-${moment.id}`}
            moment={moment}
            axisEnd={timeline.axisEndMs}
            deviceLabel={deviceLabel}
            showPhaseHeader={!!moment.isPhaseStart}
            idPrefix={idPrefix}
          />
        ))}
      </ol>
    </div>
  );
}
