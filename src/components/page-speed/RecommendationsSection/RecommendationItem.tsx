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

interface RecommendationItemProps {
  rec: Recommendation;
  items: Array<{ label: string }>;
  priorityColors: Record<string, string>;
}

export function RecommendationItem({ rec, items, priorityColors }: RecommendationItemProps) {
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
            {rec.tableData.itemsByReport && rec.tableData.itemsByReport.size > 0 ? (
              // Render separate table for each report
              Array.from(rec.tableData.itemsByReport.entries())
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
                ))
            ) : (
              // Fallback to single table if itemsByReport is not available
              <IssuesFoundTable
                headings={rec.tableData.headings}
                items={rec.tableData.items}
                device={items[0]?.label || ''}
              />
            )}
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
      </AccordionContent>
    </AccordionItem>
  );
}

