import { useMemo } from "react";
import { TreeView } from "@/components/ui/tree-view";
import { Details } from "@/components/ui/accordion";
import { renderTimeValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import type { Recommendation } from "@/features/page-speed-insights/RecommendationsSection/types";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import { isNetworkDependencyTreeRecommendation } from "@/features/page-speed-insights/RecommendationsSection/recommendationHelpers";
import {
  extractNetworkTreeFromAudit,
  networkTreeToTreeData,
} from "@/features/page-speed-insights/shared/networkDependencyTree";

interface RecommendationNetworkTreeProps {
  recommendation: Recommendation;
  insightsItems: InsightsContextItem[];
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
