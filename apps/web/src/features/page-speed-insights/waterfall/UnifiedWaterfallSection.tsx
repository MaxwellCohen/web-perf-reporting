"use client";

import { useMemo } from "react";
import { AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { AccordionSectionTitleTrigger } from "@/components/ui/accordion-section-title-trigger";
import { useDashboardSearchState } from "@/features/page-speed-insights/dashboard-view/useDashboardSearch";
import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";
import { buildPageLoadTimelineBundles } from "@/features/page-speed-insights/page-load-timeline/buildPageLoadTimeline";
import { UnifiedWaterfall } from "@/features/page-speed-insights/waterfall/UnifiedWaterfall";
import {
  FullWidthRow,
  SectionGrid,
} from "@/features/page-speed-insights/shared/MetricsSectionLayout";

/** ClassicView / accordion host for the shared waterfall (same surface as Timeline tab). */
export function UnifiedWaterfallSection() {
  const items = usePageSpeedItems();
  const { report } = useDashboardSearchState();
  const bundles = useMemo(() => buildPageLoadTimelineBundles(items), [items]);
  const active = bundles.find((bundle) => bundle.timeline.label === report) ?? bundles[0];

  if (!items.length || !active) {
    return null;
  }

  return (
    <AccordionItem value="networkWaterfall">
      <AccordionSectionTitleTrigger>Network Waterfall</AccordionSectionTitleTrigger>
      <AccordionContent>
        <SectionGrid>
          <FullWidthRow>
            <UnifiedWaterfall
              load={active.load}
              events={active.timeline.events}
              axisEndMs={active.timeline.axisEndMs}
              collapsible={false}
            />
          </FullWidthRow>
        </SectionGrid>
      </AccordionContent>
    </AccordionItem>
  );
}
