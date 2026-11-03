"use client";

import type { ReactNode } from "react";
import type { PageLoadTimeline } from "./types";

export function timelineDisplayName(timeline: PageLoadTimeline): string {
  return timeline.label?.trim() || "Report";
}

export function TimelinePane({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="min-w-0" data-testid="timeline-pane" data-timeline-label={name}>
      {children}
    </div>
  );
}

export function TimelinePaneLabel({ children }: { children: ReactNode }) {
  return <p className="mb-2 truncate text-sm font-semibold text-muted-foreground">{children}</p>;
}
