"use client";

import { AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { AccordionSectionTitleTrigger } from "@/components/ui/accordion-section-title-trigger";
import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";
import { NetworkMetricsGrid } from "./NetworkMetricsGrid";

export function NetworkMetricsComponent() {
  const items = usePageSpeedItems();

  if (!items.length) {
    return null;
  }

  return (
    <AccordionItem value="networkMetrics">
      <AccordionSectionTitleTrigger>Network Metrics</AccordionSectionTitleTrigger>
      <AccordionContent>
        <NetworkMetricsGrid />
      </AccordionContent>
    </AccordionItem>
  );
}
