"use client";

import { AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { AccordionSectionTitleTrigger } from "@/components/ui/accordion-section-title-trigger";
import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";
import { LCPBreakdownCard } from "@/features/page-speed-insights/network-metrics/LCPBreakdownCard";
import { SupplementaryTimingCard } from "@/features/page-speed-insights/network-metrics/SupplementaryTimingCard";
import { TimelineCard } from "@/features/page-speed-insights/network-metrics/TimelineCard";
import { TimelineChartCard } from "@/features/page-speed-insights/network-metrics/TimelineChartCard";
import {
  ChartTableStack,
  FullWidthRow,
  SectionGrid,
} from "@/features/page-speed-insights/shared/MetricsSectionLayout";

export function LoadTimelineSection() {
  const items = usePageSpeedItems();

  if (!items.length) {
    return null;
  }

  return (
    <AccordionItem value="loadTimeline">
      <AccordionSectionTitleTrigger>Load Timeline &amp; LCP</AccordionSectionTitleTrigger>
      <AccordionContent>
        <SectionGrid>
          <FullWidthRow>
            <ChartTableStack>
              <TimelineChartCard />
              <TimelineCard />
            </ChartTableStack>
          </FullWidthRow>
          <LCPBreakdownCard />
          <SupplementaryTimingCard />
        </SectionGrid>
      </AccordionContent>
    </AccordionItem>
  );
}
