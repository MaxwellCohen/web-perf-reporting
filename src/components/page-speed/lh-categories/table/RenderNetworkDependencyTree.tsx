import { useContext } from 'react';
import { InsightsContext, InsightsContextItem } from '@/components/page-speed/PageSpeedContext';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Details } from '@/components/ui/accordion';
import { TreeDataItem, TreeView } from '@/components/ui/tree-view';
import { renderTimeValue } from '@/components/page-speed/lh-categories/table/RenderTableValue';

// Type definitions for network dependency tree
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
  type: 'network-tree';
  longestChain?: {
    duration: number;
  };
  chains: NetworkTreeChains;
};

function extractNetworkTreeFromAudit(item: InsightsContextItem): {
  tree: NetworkTreeValue | null;
  label: string;
} {
  const audit = item.item?.lighthouseResult?.audits?.['network-dependency-tree-insight'];
  if (!audit?.details || audit.details.type !== 'list') {
    return { tree: null, label: item.label };
  }

  // Find the network-tree value in the list items
  const listItems = (audit.details as { items?: Array<{ value?: unknown }> })?.items || [];
  const networkTreeItem = listItems.find(
    (item) =>
      item.value &&
      typeof item.value === 'object' &&
      'type' in item.value &&
      item.value.type === 'network-tree'
  );

  if (!networkTreeItem?.value) {
    return { tree: null, label: item.label };
  }

  return {
    tree: networkTreeItem.value as NetworkTreeValue,
    label: item.label,
  };
}

function networkTreeToTreeData(
  chains: NetworkTreeChains,
  isRoot = false
): TreeDataItem[] {
  return Object.entries(chains).map(([id, node]) => {
    const parts: string[] = [];
    
    // Add URL
    parts.push(node.url);
    
    // Add transfer size if available
    if (node.transferSize !== undefined) {
      parts.push(`Transfer: ${formatBytes(node.transferSize)}`);
    }
    
    // Add nav start to end time if available
    if (node.navStartToEndTime !== undefined) {
      parts.push(`Time: ${renderTimeValue(node.navStartToEndTime)}`);
    }
    
    // Mark longest chain
    if (node.isLongest) {
      parts.push('(Longest Chain)');
    }

    return {
      id,
      name: parts.join(' | '),
      icon: undefined,
      selectedIcon: undefined,
      openIcon: undefined,
      draggable: false,
      droppable: false,
      isRoot: isRoot,
      children: node.children
        ? networkTreeToTreeData(node.children, false)
        : undefined,
    };
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 bytes';
  const kb = bytes / 1024;
  const mb = kb / 1024;
  if (mb >= 1) {
    return `${mb.toFixed(2)} MB`;
  }
  if (kb >= 1) {
    return `${kb.toFixed(2)} KB`;
  }
  return `${bytes} bytes`;
}

export function RenderNetworkDependencyTree() {
  const items = useContext(InsightsContext);
  
  const networkTrees = items.map(extractNetworkTreeFromAudit).filter(
    ({ tree }) => tree !== null
  );

  if (networkTrees.length === 0) {
    return null;
  }

  return (
    <AccordionItem value={'networkDependencyTree'}>
      <AccordionTrigger>
        <div className="text-lg font-bold group-hover:underline">
          Network Dependency Tree
        </div>
      </AccordionTrigger>
      <AccordionContent>
        {networkTrees.map(({ tree, label }) => {
          if (!tree) return null;
          
          return (
            <NetworkDependencyTreeSection
              key={label}
              tree={tree}
              label={label}
            />
          );
        })}
      </AccordionContent>
    </AccordionItem>
  );
}

function NetworkDependencyTreeSection({
  tree,
  label,
}: {
  tree: NetworkTreeValue;
  label: string;
}) {
  if (!tree.chains || Object.keys(tree.chains).length === 0) {
    return null;
  }

  const treeData = networkTreeToTreeData(tree.chains, true);

  return (
    <Details className="flex flex-col gap-2 print:border-0">
      <summary className="flex flex-col gap-2">
        <div className="text-lg font-bold">
          Network Dependency Tree for {label}
        </div>
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

