"use client";

import { RenderFilmStrip } from "@/features/page-speed-insights/RenderFilmStrip";
import { LoadTimelineSection } from "@/features/page-speed-insights/network-metrics";
import { SectionStack } from "@/features/page-speed-insights/dashboard-view/SectionStack";

const LOADING_OPEN = ["Screenshots", "loadTimeline"];

export function LoadingTabPanel() {
  return (
    <SectionStack defaultOpen={LOADING_OPEN}>
      <RenderFilmStrip />
      <LoadTimelineSection />
    </SectionStack>
  );
}
