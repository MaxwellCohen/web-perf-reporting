"use client";

import { AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { AccordionSectionTitleTrigger } from "@/components/ui/accordion-section-title-trigger";
import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";
import {
  EntitiesTableCard,
  useEntitiesTableData,
} from "@/features/page-speed-insights/lh-categories/table/EntitiesTable";
import { NetworkRequestsSummaryCard } from "@/features/page-speed-insights/network-metrics/NetworkRequestsSummaryCard";
import { NetworkRTTCard } from "@/features/page-speed-insights/network-metrics/NetworkRTTCard";
import { OriginLatencyChartCard } from "@/features/page-speed-insights/network-metrics/OriginLatencyChartCard";
import { ResourceTypeBreakdownCard } from "@/features/page-speed-insights/network-metrics/ResourceTypeBreakdownCard";
import { ResourceTypeChartCard } from "@/features/page-speed-insights/network-metrics/ResourceTypeChartCard";
import { ServerLatencyCard } from "@/features/page-speed-insights/network-metrics/ServerLatencyCard";
import { TopResourcesCard } from "@/features/page-speed-insights/network-metrics/TopResourcesCard";
import {
  FullWidthRow,
  SectionGrid,
  TwoColumnRow,
} from "@/features/page-speed-insights/shared/MetricsSectionLayout";

export function NetworkResourcesSection() {
  const items = usePageSpeedItems();
  const { data, columns, hasEntities } = useEntitiesTableData();

  if (!items.length) {
    return null;
  }

  return (
    <AccordionItem value="networkResources">
      <AccordionSectionTitleTrigger>Network &amp; Resources</AccordionSectionTitleTrigger>
      <AccordionContent>
        <SectionGrid>
          <TwoColumnRow>
            <OriginLatencyChartCard mode="rtt" />
            <OriginLatencyChartCard mode="latency" />
          </TwoColumnRow>
          <TwoColumnRow>
            <NetworkRTTCard />
            <ServerLatencyCard />
          </TwoColumnRow>
          <NetworkRequestsSummaryCard />
          <ResourceTypeChartCard />
          <ResourceTypeBreakdownCard />
          <TopResourcesCard />
          {hasEntities ? (
            <FullWidthRow>
              <EntitiesTableCard data={data} columns={columns} />
            </FullWidthRow>
          ) : null}
        </SectionGrid>
      </AccordionContent>
    </AccordionItem>
  );
}
