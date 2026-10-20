"use client";

import { CWVMetricsComponent } from "@/features/page-speed-insights/CWVMetricsComponent";
import { SectionStack } from "@/features/page-speed-insights/dashboard-view/SectionStack";
import { JavaScriptPerformanceComponent } from "@/features/page-speed-insights/javascript-metrics/JavaScriptPerformanceComponent";
import { LighthouseAuditsPanel } from "@/features/page-speed-insights/LighthouseAuditsPanel";
import { LoadingExperiencesSection } from "@/features/page-speed-insights/loading-experience";
import {
  LoadTimelineSection,
  NetworkResourcesSection,
} from "@/features/page-speed-insights/network-metrics";
import { UnifiedWaterfallSection } from "@/features/page-speed-insights/waterfall/UnifiedWaterfallSection";
import { RecommendationsSection } from "@/features/page-speed-insights/RecommendationsSection";
import { RenderFilmStrip } from "@/features/page-speed-insights/RenderFilmStrip";
import { ScriptTreemapSection } from "@/features/page-speed-insights/script-treemap";

export function ClassicView() {
  return (
    <>
      <SectionStack defaultOpen={[]}>
        <LoadingExperiencesSection />
        <CWVMetricsComponent />
        <RenderFilmStrip />
        <ScriptTreemapSection />
        <LoadTimelineSection />
        <UnifiedWaterfallSection />
        <NetworkResourcesSection />
        <JavaScriptPerformanceComponent />
        <RecommendationsSection />
      </SectionStack>
      <LighthouseAuditsPanel />
    </>
  );
}
