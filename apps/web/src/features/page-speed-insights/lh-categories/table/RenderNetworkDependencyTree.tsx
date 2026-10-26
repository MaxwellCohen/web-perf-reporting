import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";
import { AccordionItem, AccordionContent } from "@/components/ui/accordion";
import { AccordionSectionTitleTrigger } from "@/components/ui/accordion-section-title-trigger";
import { Details } from "@/components/ui/accordion";
import { TreeView } from "@/components/ui/tree-view";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import {
  extractNetworkTreeFromAudit,
  networkTreeToTreeData,
  type NetworkTreeValue,
} from "@/features/page-speed-insights/shared/networkDependencyTree";

export function RenderNetworkDependencyTree({ embedded = false }: { embedded?: boolean } = {}) {
  const items = usePageSpeedItems();

  const networkTrees = items.map(extractNetworkTreeFromAudit).filter(({ tree }) => tree !== null);

  if (networkTrees.length === 0) {
    return null;
  }

  const sections = networkTrees.map(({ tree, label }) => {
    if (!tree) return null;
    return (
      <NetworkDependencyTreeSection key={label} tree={tree} label={label} embedded={embedded} />
    );
  });

  if (embedded) return <div className="space-y-4">{sections}</div>;

  return (
    <AccordionItem value={"networkDependencyTree"}>
      <AccordionSectionTitleTrigger>Network Dependency Tree</AccordionSectionTitleTrigger>
      <AccordionContent>{sections}</AccordionContent>
    </AccordionItem>
  );
}

function NetworkDependencyTreeSection({
  tree,
  label,
  embedded,
}: {
  tree: NetworkTreeValue;
  label: string;
  embedded: boolean;
}) {
  if (!tree.chains || Object.keys(tree.chains).length === 0) {
    return null;
  }

  const treeData = networkTreeToTreeData(tree.chains, true);

  const treeView = (
    <div className="lh-crc w-full overflow-x-auto">
      <div className="lh-crc-initial-nav mb-1 font-mono text-[11px] tracking-[0.14em] text-zinc-400 uppercase">
        Initial Navigation
      </div>
      <TreeView data={treeData} expandAll />
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-2">
        <div className="text-sm font-medium">
          Network dependency tree for {label}
          {tree.longestChain ? ` · longest chain ${formatMs(tree.longestChain.duration)}` : ""}
        </div>
        {treeView}
      </div>
    );
  }

  return (
    <Details className="flex flex-col gap-2 print:border-0">
      <summary className="flex flex-col gap-2">
        <div className="text-lg font-bold">Network Dependency Tree for {label}</div>
        {tree.longestChain && (
          <div className="text-sm">Longest Chain Duration: {formatMs(tree.longestChain.duration)}</div>
        )}
      </summary>
      {treeView}
    </Details>
  );
}
