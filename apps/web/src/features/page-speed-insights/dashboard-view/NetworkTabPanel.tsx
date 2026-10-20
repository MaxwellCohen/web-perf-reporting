"use client";

import { NetworkResourcesSection } from "@/features/page-speed-insights/network-metrics";
import { UnifiedWaterfallSection } from "@/features/page-speed-insights/waterfall/UnifiedWaterfallSection";
import { SectionStack } from "@/features/page-speed-insights/dashboard-view/SectionStack";

const NETWORK_OPEN = ["networkWaterfall", "networkResources"];

export function NetworkTabPanel() {
  return (
    <SectionStack defaultOpen={NETWORK_OPEN}>
      <UnifiedWaterfallSection />
      <NetworkResourcesSection />
    </SectionStack>
  );
}
