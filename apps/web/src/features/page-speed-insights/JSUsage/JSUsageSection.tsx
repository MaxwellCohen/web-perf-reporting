"use client";
import { TreeMapData } from "@/lib/schema";
import { flattenTreeMapNode } from "@/features/page-speed-insights/flattenTreeMapNode";
import { useScriptTreemapItems } from "@/features/page-speed-insights/script-treemap/useScriptTreemapItems";
import { Card, CardHeader } from "@/components/ui/card";
import { JSUsageTableWithControls } from "@/features/page-speed-insights/JSUsage/JSUsageTable";
import { ClientOnly } from "@/components/common/ClientOnly";
import { Details } from "@/components/ui/accordion";
import { accordionSectionTitleClassName } from "@/components/ui/accordion-section-title-trigger";

export function JSUsageSection() {
  const treeDataArr = useScriptTreemapItems();
  if (treeDataArr.length === 0) return null;
  return (
    <>
      {treeDataArr.map(({ treeData, label }, idx) => (
        <JSUsageCard key={`${idx}_label`} treeData={treeData} label={label} />
      ))}
    </>
  );
}

export function JSUsageCardSection() {
  const treeDataArr = useScriptTreemapItems();
  if (treeDataArr.length === 0) return null;
  return (
    <>
      {treeDataArr.map(({ treeData, label }, idx) => (
        <JSUsageCard key={`${idx}_label`} treeData={treeData} label={label} />
      ))}
    </>
  );
}

export function JSUsageCard({ treeData, label }: { treeData: TreeMapData; label?: string }) {
  const nodes = treeData.nodes.map(flattenTreeMapNode);

  return (
    <Card className="col-span-1 w-full min-w-0 lg:col-span-full">
      <CardHeader className="px-4 text-center text-2xl font-bold sm:px-6">
        {`JS Usage Table`}
        {label ? ` for ${label}` : ` `}
      </CardHeader>
      <div className="min-w-0 px-2 pb-4 sm:px-6">
        <ClientOnly>
          <JSUsageTableWithControls data={nodes} />
        </ClientOnly>
      </div>
    </Card>
  );
}

export function JSUsageAccordion({ treeData, label }: { treeData: TreeMapData; label?: string }) {
  const nodes = treeData.nodes.map(flattenTreeMapNode);

  return (
    <Details className="col-span-1 w-full min-w-0 lg:col-span-full">
      <summary className=" flex flex-col gap-2">
        <div className={accordionSectionTitleClassName}>
          {`JS Usage Table`}
          {label ? ` for ${label}` : ` `}
        </div>
      </summary>
      <div className="min-w-0">
        <ClientOnly>
          <JSUsageTableWithControls data={nodes} />
        </ClientOnly>
      </div>
    </Details>
  );
}
