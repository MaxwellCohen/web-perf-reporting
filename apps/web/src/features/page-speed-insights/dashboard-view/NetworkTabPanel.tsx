"use client";

import { NetworkResourcesSection } from "@/features/page-speed-insights/network-metrics";
import { ResourceSummaryTiles } from "@/features/page-speed-insights/network-metrics/ResourceSummaryTiles";
import { UnifiedWaterfallSection } from "@/features/page-speed-insights/waterfall/UnifiedWaterfallSection";
import { SectionStack } from "@/features/page-speed-insights/dashboard-view/SectionStack";

const NETWORK_OPEN = ["networkWaterfall", "networkResources"];

export function NetworkTabPanel() {
  return (
    <div className="flex flex-col gap-6">
      <ResourceSummaryTiles />
      <SectionStack defaultOpen={NETWORK_OPEN}>
        <UnifiedWaterfallSection />
        <NetworkResourcesSection />
      </SectionStack>
    </div>
  );
}
