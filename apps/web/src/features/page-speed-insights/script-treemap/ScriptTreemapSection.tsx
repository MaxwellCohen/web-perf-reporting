"use client";

import { useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AccordionSectionTitleTrigger } from "@/components/ui/accordion-section-title-trigger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientOnly } from "@/components/common/ClientOnly";
import { JSUsageTableWithControls } from "@/features/page-speed-insights/JSUsage/JSUsageTable";
import { flattenTreeMapNode } from "@/features/page-speed-insights/flattenTreeMapNode";
import { ScriptTreemapChartCard } from "@/features/page-speed-insights/script-treemap/ScriptTreemapChartCard";
import { useScriptTreemapItems } from "@/features/page-speed-insights/script-treemap/useScriptTreemapItems";
import {
  ChartTableStack,
  FullWidthRow,
  SectionGrid,
} from "@/features/page-speed-insights/shared/MetricsSectionLayout";
import type { TreeMapData } from "@/lib/schema";

function ScriptTreemapTableCard({ treeData, label }: { treeData: TreeMapData; label?: string }) {
  const nodes = useMemo(() => treeData.nodes.map(flattenTreeMapNode), [treeData]);
  const title = label ? `JS Usage Table (${label})` : "JS Usage Table";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ClientOnly>
          <JSUsageTableWithControls data={nodes} />
        </ClientOnly>
      </CardContent>
    </Card>
  );
}

export function ScriptTreemapSection() {
  const treemapItems = useScriptTreemapItems();

  const reportValues = useMemo(
    () => treemapItems.map(({ label }, index) => `${label}_${index}`),
    [treemapItems],
  );

  if (!treemapItems.length) {
    return null;
  }

  return (
    <AccordionItem value="scriptTreemap">
      <AccordionSectionTitleTrigger>Script Treemap</AccordionSectionTitleTrigger>
      <AccordionContent>
        <Accordion type="multiple" defaultValue={reportValues}>
          {treemapItems.map(({ treeData, label }, index) => {
            const value = `${label}_${index}`;
            const reportLabel = label || `Report ${index + 1}`;

            return (
              <AccordionItem key={value} value={value}>
                <AccordionTrigger>{reportLabel}</AccordionTrigger>
                <AccordionContent>
                  <SectionGrid>
                    <FullWidthRow>
                      <ChartTableStack>
                        <ScriptTreemapChartCard treeData={treeData} label={label} />
                        <ScriptTreemapTableCard treeData={treeData} label={label} />
                      </ChartTableStack>
                    </FullWidthRow>
                  </SectionGrid>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </AccordionContent>
    </AccordionItem>
  );
}
