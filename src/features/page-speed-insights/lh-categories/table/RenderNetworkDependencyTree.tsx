import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";
import { AccordionItem, AccordionContent } from "@/components/ui/accordion";
import { AccordionSectionTitleTrigger } from "@/components/ui/accordion-section-title-trigger";
import { Details } from "@/components/ui/accordion";
import { TreeView } from "@/components/ui/tree-view";
import { renderTimeValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import {
  extractNetworkTreeFromAudit,
  networkTreeToTreeData,
  type NetworkTreeValue,
} from "@/features/page-speed-insights/shared/networkDependencyTree";

export function RenderNetworkDependencyTree() {
  const items = usePageSpeedItems();

  const networkTrees = items.map(extractNetworkTreeFromAudit).filter(({ tree }) => tree !== null);

  if (networkTrees.length === 0) {
    return null;
  }

  return (
    <AccordionItem value={"networkDependencyTree"}>
      <AccordionSectionTitleTrigger>Network Dependency Tree</AccordionSectionTitleTrigger>
      <AccordionContent>
        {networkTrees.map(({ tree, label }) => {
          if (!tree) return null;

          return <NetworkDependencyTreeSection key={label} tree={tree} label={label} />;
        })}
      </AccordionContent>
    </AccordionItem>
  );
}

function NetworkDependencyTreeSection({ tree, label }: { tree: NetworkTreeValue; label: string }) {
  if (!tree.chains || Object.keys(tree.chains).length === 0) {
    return null;
  }

  const treeData = networkTreeToTreeData(tree.chains, true);

  return (
    <Details className="flex flex-col gap-2 print:border-0">
      <summary className="flex flex-col gap-2">
        <div className="text-lg font-bold">Network Dependency Tree for {label}</div>
        {tree.longestChain && (
          <div className="text-sm">
            Longest Chain Duration: {renderTimeValue(tree.longestChain.duration)}
          </div>
        )}
      </summary>
      <div className="lh-crc overflow-x-auto w-full">
        <div className="lh-crc-initial-nav text-gray-500 italic mb-2">Initial Navigation</div>
        <TreeView data={treeData} expandAll />
      </div>
    </Details>
  );
}
