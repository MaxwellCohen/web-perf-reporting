"use client";

import { CWVMetricsComponent } from "@/features/page-speed-insights/CWVMetricsComponent";
import { SectionStack } from "@/features/page-speed-insights/dashboard-view/SectionStack";
import { JavaScriptPerformanceComponent } from "@/features/page-speed-insights/javascript-metrics/JavaScriptPerformanceComponent";
import { LighthouseAuditsPanel } from "@/features/page-speed-insights/LighthouseAuditsPanel";
import { LoadingExperiencesSection } from "@/features/page-speed-insights/loading-experience/LoadingExperiencesSection";
import { LoadTimelineSection } from "@/features/page-speed-insights/network-metrics/LoadTimelineSection";
import { NetworkResourcesSection } from "@/features/page-speed-insights/network-metrics/NetworkResourcesSection";
import { UnifiedWaterfallSection } from "@/features/page-speed-insights/waterfall/UnifiedWaterfallSection";
import { RecommendationsSection } from "@/features/page-speed-insights/RecommendationsSection/RecommendationsSection";
import { RenderFilmStrip } from "@/features/page-speed-insights/RenderFilmStrip";
import { ScriptTreemapSection } from "@/features/page-speed-insights/script-treemap/ScriptTreemapSection";
import { FullWidthTables } from "@/features/page-speed-insights/tanstack-table-v9/fullWidthTables";

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
      <FullWidthTables>
        <LighthouseAuditsPanel />
      </FullWidthTables>
    </>
  );
}
