import ReactMarkdown from 'react-markdown';
import { Badge } from '@/components/ui/badge';
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { formatTime } from '@/components/page-speed/RecommendationsSection/utils';
import { ActionableStepsTable } from '@/components/page-speed/RecommendationsSection/ActionableStepsTable';
import { IssuesFoundTable } from '@/components/page-speed/RecommendationsSection/IssuesFoundTable';
import { ResourcesTable } from '@/components/page-speed/RecommendationsSection/ResourcesTable';
import type { Recommendation } from '@/components/page-speed/RecommendationsSection/types';
import { shouldShowSeparateTablesPerReport } from '@/components/page-speed/auditTableConfig';
import { useContext, useMemo } from 'react';
import { InsightsContext, InsightsContextItem } from '@/components/page-speed/PageSpeedContext';
import { TreeDataItem, TreeView } from '@/components/ui/tree-view';
import { renderTimeValue } from '@/components/page-speed/lh-categories/table/RenderTableValue';
import { Details } from '@/components/ui/accordion';

interface RecommendationItemProps {
  rec: Recommendation;
  items: InsightsContextItem[];
  priorityColors: Record<string, string>;
}

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

export function RecommendationItem({ rec, items, priorityColors }: RecommendationItemProps) {
  const insightsContextItems = useContext(InsightsContext);
  
  // Check if this is a network dependency tree recommendation
  const isNetworkDependencyTree = rec.id.startsWith('network-dependency-tree-insight');
  
  // Extract network trees for reports that have issues
  const networkTrees = useMemo(() => {
    if (!isNetworkDependencyTree) return [];
    
    // Get reports that have actionable steps (indicating issues)
    const reportsWithIssues = new Set(
      rec.actionableSteps.flatMap(step => step.reports)
    );
    
    // Extract network trees only for reports with issues
    return insightsContextItems
      .filter(item => reportsWithIssues.has(item.label))
      .map(extractNetworkTreeFromAudit)
      .filter(({ tree }) => tree !== null);
  }, [isNetworkDependencyTree, rec.actionableSteps, insightsContextItems]);
  return (
    <AccordionItem key={rec.id} value={rec.id} className="border rounded-lg">
      <AccordionTrigger className="px-4 py-3 hover:no-underline">
        <div className="flex items-start justify-between gap-4 w-full text-left">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-base">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <>{children}</>,
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {rec.title}
                </ReactMarkdown>
              </span>
              <Badge className={priorityColors[rec.priority]}>
                {rec.priority}
              </Badge>
            </div>
            {rec.impact.metric && rec.impact.savings ? (
              <div className="text-sm text-muted-foreground">
                Potential savings: {formatTime(rec.impact.savings)} on{' '}
                {rec.impact.metric}
              </div>
            ) : null}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        {rec.description && (
          <div className="mb-4 text-sm">
            <ReactMarkdown>{rec.description}</ReactMarkdown>
          </div>
        )}
        <div className="mb-4">
          <h4 className="font-semibold text-sm mb-2">
            Actionable Steps:
          </h4>
          <ActionableStepsTable rec={rec} items={items} />
        </div>
        {rec.tableData && rec.tableData.items.length > 0 && (
          <div className="mt-4 mb-4">
            <h4 className="font-semibold text-sm mb-2">
              Issues Found:
            </h4>
            {(() => {
              // Extract audit ID from recommendation ID (format: `${auditId}-${metric}` or `${auditId}-failed`)
              const auditId = rec.id.split('-').slice(0, -1).join('-');
              const shouldShowSeparate = shouldShowSeparateTablesPerReport(auditId);
              
              // Only show separate tables per report if this audit is configured for it
              if (shouldShowSeparate && rec.tableData.itemsByReport && rec.tableData.itemsByReport.size > 0) {
                // Render separate table for each report
                return Array.from(rec.tableData.itemsByReport.entries())
                  .sort(([labelA], [labelB]) => {
                    // Sort: All Devices first, then Mobile, then Desktop
                    if (labelA === 'All Devices' && labelB !== 'All Devices') return -1;
                    if (labelA !== 'All Devices' && labelB === 'All Devices') return 1;
                    const order = ['Mobile', 'Desktop'];
                    const aIndex = order.findIndex(l => labelA.includes(l));
                    const bIndex = order.findIndex(l => labelB.includes(l));
                    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                    if (aIndex !== -1) return -1;
                    if (bIndex !== -1) return 1;
                    return labelA.localeCompare(labelB);
                  })
                  .map(([reportLabel, reportItems]) => (
                    <div key={reportLabel} className="mb-4">
                      <h5 className="font-semibold text-xs mb-2 text-muted-foreground">
                        {reportLabel}
                      </h5>
                      <IssuesFoundTable
                        headings={rec.tableData!.headings}
                        items={reportItems}
                        device={reportLabel}
                      />
                    </div>
                  ));
              }
              
              // Fallback to single combined table
              return (
                <IssuesFoundTable
                  headings={rec.tableData.headings}
                  items={rec.tableData.items}
                  device={items[0]?.label || ''}
                />
              );
            })()}
          </div>
        )}
        {rec.items && rec.items.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold text-sm mb-2">
              Resources to Optimize:
            </h4>
            <ResourcesTable items={rec.items} />
          </div>
        )}
        {isNetworkDependencyTree && networkTrees.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold text-sm mb-2">
              Network Dependency Tree:
            </h4>
            {networkTrees.map(({ tree, label }) => {
              if (!tree || !tree.chains || Object.keys(tree.chains).length === 0) {
                return null;
              }
              
              const treeData = networkTreeToTreeData(tree.chains, true);
              
              return (
                <Details key={label} className="flex flex-col gap-2 mb-4 border rounded-lg p-4">
                  <summary className="flex flex-col gap-2 cursor-pointer">
                    <div className="font-semibold text-sm">
                      {label}
                    </div>
                    {tree.longestChain && (
                      <div className="text-xs text-muted-foreground">
                        Longest Chain Duration: {renderTimeValue(tree.longestChain.duration)}
                      </div>
                    )}
                  </summary>
                  <div className="lh-crc overflow-x-auto w-full mt-2">
                    <div className="lh-crc-initial-nav text-gray-500 italic mb-2 text-xs">
                      Initial Navigation
                    </div>
                    <TreeView data={treeData} expandAll />
                  </div>
                </Details>
              );
            })}
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

