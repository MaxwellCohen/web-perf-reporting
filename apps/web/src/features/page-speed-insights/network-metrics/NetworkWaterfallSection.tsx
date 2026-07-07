"use client";

import { AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { AccordionSectionTitleTrigger } from "@/components/ui/accordion-section-title-trigger";
import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";
import { NetworkWaterfallCard } from "@/features/page-speed-insights/network-metrics/NetworkWaterfallCard";
import {
  FullWidthRow,
  SectionGrid,
} from "@/features/page-speed-insights/shared/MetricsSectionLayout";

export function NetworkWaterfallSection() {
  const items = usePageSpeedItems();

  if (!items.length) {
    return null;
  }

  return (
    <AccordionItem value="networkWaterfall">
      <AccordionSectionTitleTrigger>Network Waterfall</AccordionSectionTitleTrigger>
      <AccordionContent>
        <SectionGrid>
          <FullWidthRow>
            <NetworkWaterfallCard />
          </FullWidthRow>
        </SectionGrid>
      </AccordionContent>
    </AccordionItem>
  );
}
