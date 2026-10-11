"use client";

import {
  NetworkResourcesSection,
  NetworkWaterfallSection,
} from "@/features/page-speed-insights/network-metrics";
import { SectionStack } from "@/features/page-speed-insights/dashboard-view/SectionStack";

const NETWORK_OPEN = ["networkWaterfall", "networkResources"];

export function NetworkTabPanel() {
  return (
    <SectionStack defaultOpen={NETWORK_OPEN}>
      <NetworkWaterfallSection />
      <NetworkResourcesSection />
    </SectionStack>
  );
}
