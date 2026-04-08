import type { TreeDataItem } from "@/components/ui/tree-view";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import {
  formatBytes,
  renderTimeValue,
} from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";

export type NetworkTreeNode = {
  url: string;
  transferSize?: number;
  navStartToEndTime?: number;
  isLongest?: boolean;
  children?: NetworkTreeChains;
};

export type NetworkTreeChains = {
  [id: string]: NetworkTreeNode;
};

export type NetworkTreeValue = {
  type: "network-tree";
  longestChain?: {
    duration: number;
  };
  chains: NetworkTreeChains;
};

export function extractNetworkTreeFromAudit(item: InsightsContextItem): {
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

export function networkTreeToTreeData(chains: NetworkTreeChains, isRoot = false): TreeDataItem[] {
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
