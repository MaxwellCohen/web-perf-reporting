"use client";

import { CWVMetricsComponent } from "@/features/page-speed-insights/CWVMetricsComponent";
import { PlatformNotesOverview } from "@/features/page-speed-insights/dashboard-view/PlatformNotes";
import { SectionStack } from "@/features/page-speed-insights/dashboard-view/SectionStack";
import { LoadingExperiencesSection } from "@/features/page-speed-insights/loading-experience/LoadingExperiencesSection";

const OVERVIEW_OPEN = ["cwv", "loadingExperience", "originLoadingExperience"];

export function OverviewTabPanel() {
  return (
    <div className="flex flex-col gap-6">
      <SectionStack defaultOpen={OVERVIEW_OPEN}>
        <CWVMetricsComponent />
        <LoadingExperiencesSection />
      </SectionStack>
      <PlatformNotesOverview />
    </div>
  );
}
