"use client";

import { RecommendationsSection } from "@/features/page-speed-insights/RecommendationsSection";
import { SectionStack } from "@/features/page-speed-insights/dashboard-view/SectionStack";

const RECOMMENDATIONS_OPEN = ["recommendations"];

export function RecommendationsTabPanel() {
  return (
    <SectionStack defaultOpen={RECOMMENDATIONS_OPEN}>
      <RecommendationsSection />
    </SectionStack>
  );
}
