import {
  ReportColumn,
  ReportColumns,
  ReportHeading,
} from "@/features/page-speed-insights/shared/ReportColumns";
import { useIsEmbeddedDetails } from "@/features/page-speed-insights/lh-categories/EmbeddedDetails";
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

export function RenderNetworkDependencyTree() {
  const embedded = useIsEmbeddedDetails();
  const items = usePageSpeedItems();

  const networkTrees = items.map(extractNetworkTreeFromAudit).filter(({ tree }) => tree !== null);

  if (networkTrees.length === 0) {
    return null;
  }

  const sections = networkTrees.map(({ tree, label }) => {
    if (!tree) return null;
    return <NetworkDependencyTreeSection key={label} tree={tree} label={label} />;
  });

  if (embedded) return <ReportColumns>{sections}</ReportColumns>;

  return (
    <AccordionItem value={"networkDependencyTree"}>
      <AccordionSectionTitleTrigger>Network Dependency Tree</AccordionSectionTitleTrigger>
      <AccordionContent>
        <ReportColumns>{sections}</ReportColumns>
      </AccordionContent>
    </AccordionItem>
  );
}

function NetworkDependencyTreeSection({ tree, label }: { tree: NetworkTreeValue; label: string }) {
  const embedded = useIsEmbeddedDetails();
  if (!tree.chains || Object.keys(tree.chains).length === 0) {
    return null;
  }

  const treeData = networkTreeToTreeData(tree.chains, true);

  const treeView = (
    <div className="lh-crc w-full overflow-x-auto">
      <div className="lh-crc-initial-nav mb-1 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
        Initial Navigation
      </div>
      <TreeView data={treeData} expandAll />
    </div>
  );

  if (embedded) {
    return (
      <ReportColumn
        label={label}
        meta={tree.longestChain ? `longest chain ${formatMs(tree.longestChain.duration)}` : null}
      >
        {treeView}
      </ReportColumn>
    );
  }

  return (
    <Details className="flex min-w-0 flex-col gap-2 print:border-0">
      <summary className="flex flex-col gap-2">
        <ReportHeading>{label}</ReportHeading>
        {tree.longestChain && (
          <div className="text-sm">
            Longest Chain Duration: {formatMs(tree.longestChain.duration)}
          </div>
        )}
      </summary>
      {treeView}
    </Details>
  );
}
