import ReactMarkdown from 'react-markdown';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Recommendation } from '@/components/page-speed/RecommendationsSection/types';
import type { ActionableStep } from '@/components/page-speed/RecommendationsSection/types';

interface ActionableStepsTableProps {
  rec: Recommendation;
  items: Array<{ label: string }>;
}

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 dark:text-blue-400 hover:underline"
    >
      {children}
    </a>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="bg-muted px-1 py-0.5 rounded text-xs">
      {children}
    </code>
  ),
};

function renderStepsList(steps: ActionableStep[]) {
  if (steps.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  
  return (
    <ul className="list-disc list-inside space-y-1">
      {steps.map(({ step }, idx) => (
        <li key={idx}>
          <ReactMarkdown components={markdownComponents}>
            {step}
          </ReactMarkdown>
        </li>
      ))}
    </ul>
  );
}

export function ActionableStepsTable({ rec, items }: ActionableStepsTableProps) {
  const reportLabels = items.map(({ label }) => label);
  
  // Group steps by their reports
  const stepsByReport = new Map<string, ActionableStep[]>();
  
  rec.actionableSteps.forEach((step) => {
    // Check if this step applies to all devices
    const appliesToAll = step.reports.length === 0 || 
      (step.reports.length === reportLabels.length &&
       step.reports.every((r) => reportLabels.includes(r)));
    
    // Normalize key: use 'all' for all devices, otherwise use sorted report names
    const reportsKey = appliesToAll 
      ? 'all'
      : [...step.reports].sort().join(',');
    
    if (!stepsByReport.has(reportsKey)) {
      stepsByReport.set(reportsKey, []);
    }
    stepsByReport.get(reportsKey)!.push(step);
  });
  
  // Convert to array of rows
  const rows = Array.from(stepsByReport.entries()).map(([reportsKey, steps]) => {
    // Determine the report label
    let reportLabel: string;
    if (reportsKey === 'all') {
      reportLabel = 'All Devices';
    } else {
      reportLabel = steps[0].reports.join(', ');
    }
    
    return { reportLabel, steps, reportsKey };
  });
  
  // Sort rows: All Devices first, then Mobile, then Desktop
  rows.sort((a, b) => {
    // All Devices always comes first
    if (a.reportLabel === 'All Devices' && b.reportLabel !== 'All Devices') return -1;
    if (a.reportLabel !== 'All Devices' && b.reportLabel === 'All Devices') return 1;
    if (a.reportLabel === 'All Devices' && b.reportLabel === 'All Devices') return 0;
    
    // Then sort by Mobile, then Desktop
    // const order = ['Mobile', 'Desktop'];
    // const aIndex = order.findIndex(label => a.reportLabel.includes(label));
    // const bIndex = order.findIndex(label => b.reportLabel.includes(label));
    
    // // If both are in the order list, sort by their position
    // if (aIndex !== -1 && bIndex !== -1) {
    //   return aIndex - bIndex;
    // }
    // // If only one is in the order list, prioritize it
    // if (aIndex !== -1) return -1;
    // if (bIndex !== -1) return 1;
    
    // // Otherwise, sort alphabetically
    // return a.reportLabel.localeCompare(b.reportLabel);
    return 0;
  });
  
  return (
    <div className="w-full overflow-x-auto">
      <Table className="w-full">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs font-semibold">
              Report
            </TableHead>
            <TableHead className="text-xs font-semibold">
              Steps
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ reportLabel, steps }, idx) => (
            <TableRow key={idx} className="hover:bg-transparent">
              <TableCell className="text-sm py-2 font-medium">
                {reportLabel}
              </TableCell>
              <TableCell className="text-sm py-2">
                {renderStepsList(steps)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

