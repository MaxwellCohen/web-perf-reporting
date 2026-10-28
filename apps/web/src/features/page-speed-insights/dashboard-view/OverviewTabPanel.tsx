"use client";

import { CWVMetricsComponent } from "@/features/page-speed-insights/CWVMetricsComponent";
import { PlatformNotesOverview } from "@/features/page-speed-insights/dashboard-view/PlatformNotes";
import { SectionStack } from "@/features/page-speed-insights/dashboard-view/SectionStack";
import { SpeedUpPromptSection } from "@/features/page-speed-insights/dashboard-view/SpeedUpPromptSection";
import { LoadingExperiencesSection } from "@/features/page-speed-insights/loading-experience/LoadingExperiencesSection";
import { RenderFilmStrip } from "@/features/page-speed-insights/RenderFilmStrip";
import { FullWidthTables } from "@/features/page-speed-insights/tanstack-table-v9/fullWidthTables";

const OVERVIEW_OPEN = ["cwv", "loadingExperience", "originLoadingExperience", "Screenshots"];

export function OverviewTabPanel() {
  return (
    <FullWidthTables>
      <div className="flex flex-col gap-6">
        <SectionStack defaultOpen={OVERVIEW_OPEN}>
          <RenderFilmStrip />
          <CWVMetricsComponent />
          <LoadingExperiencesSection />
          <SpeedUpPromptSection />
        </SectionStack>
        <PlatformNotesOverview />
      </div>
    </FullWidthTables>
  );
}
