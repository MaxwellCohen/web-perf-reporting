import { useMemo } from "react";
import { TreeDataItem, TreeView } from "@/components/ui/tree-view";
import { Details } from "@/components/ui/accordion";
import { renderTimeValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { formatBytes } from "@/features/page-speed-insights/RecommendationsSection/utils";
import type { Recommendation } from "@/features/page-speed-insights/RecommendationsSection/types";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import { isNetworkDependencyTreeRecommendation } from "@/features/page-speed-insights/RecommendationsSection/recommendationHelpers";

type NetworkTreeNode = {
  url: string;
  transferSize?: number;
  navStartToEndTime?: number;
  isLongest?: boolean;
  children?: NetworkTreeChains;
};

type NetworkTreeChains = {
  [id: string]: NetworkTreeNode;
};

type NetworkTreeValue = {
  type: "network-tree";
  longestChain?: {
    duration: number;
  };
  chains: NetworkTreeChains;
};

interface RecommendationNetworkTreeProps {
  recommendation: Recommendation;
  insightsItems: InsightsContextItem[];
}

function extractNetworkTreeFromAudit(item: InsightsContextItem): {
  tree: NetworkTreeValue | null;
  label: string;
} {
  const audit = item.item?.lighthouseResult?.audits?.["network-dependency-tree-insight"];

  if (!audit?.details || audit.details.type !== "list") {
    return { tree: null, label: item.label };
  }

  const listItems = (audit.details as { items?: Array<{ value?: unknown }> })?.items || [];
  const networkTreeItem = listItems.find(
    (listItem) =>
      listItem.value &&
      typeof listItem.value === "object" &&
      "type" in listItem.value &&
      listItem.value.type === "network-tree",
  );

  if (!networkTreeItem?.value) {
    return { tree: null, label: item.label };
  }

  return {
    tree: networkTreeItem.value as NetworkTreeValue,
    label: item.label,
  };
}

function networkTreeToTreeData(chains: NetworkTreeChains, isRoot = false): TreeDataItem[] {
  return Object.entries(chains).map(([id, node]) => {
    const parts: string[] = [node.url];

    if (node.transferSize !== undefined) {
      parts.push(`Transfer: ${formatBytes(node.transferSize)}`);
    }

    if (node.navStartToEndTime !== undefined) {
      parts.push(`Time: ${renderTimeValue(node.navStartToEndTime)}`);
    }

    if (node.isLongest) {
      parts.push("(Longest Chain)");
    }

    return {
      id,
      name: parts.join(" | "),
      icon: undefined,
      selectedIcon: undefined,
      openIcon: undefined,
      draggable: false,
      droppable: false,
      isRoot,
      children: node.children ? networkTreeToTreeData(node.children, false) : undefined,
    };
  });
}

export function RecommendationNetworkTree({
  recommendation,
  insightsItems,
}: RecommendationNetworkTreeProps) {
  const networkTrees = useMemo(() => {
    if (!isNetworkDependencyTreeRecommendation(recommendation.id)) {
      return [];
    }

    const reportsWithIssues = new Set(
      recommendation.actionableSteps.flatMap((step) => step.reports),
    );

    return insightsItems
      .filter((item) => reportsWithIssues.has(item.label))
      .map(extractNetworkTreeFromAudit)
      .filter(({ tree }) => tree !== null);
  }, [insightsItems, recommendation]);

  if (networkTrees.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h4 className="mb-2 text-sm font-semibold">Network Dependency Tree:</h4>
      {networkTrees.map(({ tree, label }) => {
        if (!tree || Object.keys(tree.chains).length === 0) {
          return null;
        }

        const treeData = networkTreeToTreeData(tree.chains, true);

        return (
          <Details key={label} className="mb-4 flex flex-col gap-2 rounded-lg border p-4">
            <summary className="flex cursor-pointer flex-col gap-2">
              <div className="text-sm font-semibold">{label}</div>
              {tree.longestChain ? (
                <div className="text-xs text-muted-foreground">
                  Longest Chain Duration: {renderTimeValue(tree.longestChain.duration)}
                </div>
              ) : null}
            </summary>
            <div className="lh-crc mt-2 w-full overflow-x-auto">
              <div className="mb-2 text-xs italic text-gray-500 lh-crc-initial-nav">
                Initial Navigation
              </div>
              <TreeView data={treeData} expandAll />
            </div>
          </Details>
        );
      })}
    </div>
  );
}
