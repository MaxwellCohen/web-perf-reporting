"use client";

import { Accordion } from "@/components/ui/accordion";
import { CWVMetricsComponent } from "@/features/page-speed-insights/CWVMetricsComponent";
import { JavaScriptPerformanceComponent } from "@/features/page-speed-insights/javascript-metrics/JavaScriptPerformanceComponent";
import { LighthouseAuditsPanel } from "@/features/page-speed-insights/LighthouseAuditsPanel";
import { LoadingExperiencesSection } from "@/features/page-speed-insights/loading-experience";
import {
  LoadTimelineSection,
  NetworkResourcesSection,
  NetworkWaterfallSection,
} from "@/features/page-speed-insights/network-metrics";
import { RecommendationsSection } from "@/features/page-speed-insights/RecommendationsSection";
import { RenderFilmStrip } from "@/features/page-speed-insights/RenderFilmStrip";
import { ScriptTreemapSection } from "@/features/page-speed-insights/script-treemap";

export function ClassicView() {
  return (
    <>
      <Accordion type="multiple">
        <LoadingExperiencesSection />
        <CWVMetricsComponent />
        <RenderFilmStrip />
        <ScriptTreemapSection />
        <LoadTimelineSection />
        <NetworkWaterfallSection />
        <NetworkResourcesSection />
        <JavaScriptPerformanceComponent />
        <RecommendationsSection />
      </Accordion>
      <LighthouseAuditsPanel />
    </>
  );
}
