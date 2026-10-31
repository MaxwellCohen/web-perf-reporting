"use client";
import { TreeMapData } from "@/lib/schema";
import { flattenTreeMapNode } from "@/features/page-speed-insights/flattenTreeMapNode";
import { JSUsageTableWithControls } from "@/features/page-speed-insights/JSUsage/JSUsageTable";
import { ClientOnly } from "@/components/common/ClientOnly";
import { Details } from "@/components/ui/accordion";
import { accordionSectionTitleClassName } from "@/components/ui/accordion-section-title-trigger";

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
