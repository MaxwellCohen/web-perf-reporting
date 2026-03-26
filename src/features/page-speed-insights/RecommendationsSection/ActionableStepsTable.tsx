import ReactMarkdown from "react-markdown";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Recommendation } from "@/features/page-speed-insights/RecommendationsSection/types";
import type { ActionableStep } from "@/features/page-speed-insights/RecommendationsSection/types";
import {
  ALL_DEVICES_LABEL,
  compareReportLabels,
  formatReportLabelList,
} from "@/features/page-speed-insights/shared/reportLabels";

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
    <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>
  ),
};

const OTHER_GROUP = "\u200bOther"; // zero-width space prefix so "Other" sorts last

function getActionableStepKey(step: ActionableStep): string {
  return [step.host, step.url, step.step, formatReportLabelList(step.reports)].join("|");
}

function StepsList({ steps }: { steps: ActionableStep[] }) {
  if (steps.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  // Group steps by host
  const byHost = new Map<string, ActionableStep[]>();
  for (const s of steps) {
    const key = s.host && s.host.trim() ? s.host : OTHER_GROUP;
    if (!byHost.has(key)) byHost.set(key, []);
    byHost.get(key)!.push(s);
  }

  const sortedGroups = Array.from(byHost.entries()).sort(([a], [b]) => {
    if (a === OTHER_GROUP) return 1;
    if (b === OTHER_GROUP) return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-3">
      {sortedGroups.map(([hostKey, groupSteps]) => (
        <div key={hostKey}>
          {hostKey !== OTHER_GROUP && (
            <div className="text-xs font-medium text-muted-foreground mb-1.5">{hostKey}</div>
          )}
          <ul className="list-disc list-inside space-y-1">
            {groupSteps.map((step) => (
              <li key={getActionableStepKey(step)}>
                <ReactMarkdown components={markdownComponents}>{step.step}</ReactMarkdown>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function ActionableStepsTable({ rec, items }: ActionableStepsTableProps) {
  const reportLabels = items.map(({ label }) => label);

  // Group steps by their reports
  const stepsByReport = new Map<string, ActionableStep[]>();

  rec.actionableSteps.forEach((step) => {
    // Check if this step applies to all devices
    const appliesToAll =
      step.reports.length === 0 ||
      (step.reports.length === reportLabels.length &&
        step.reports.every((r) => reportLabels.includes(r)));

    const reportsKey = appliesToAll ? ALL_DEVICES_LABEL : formatReportLabelList(step.reports);

    if (!stepsByReport.has(reportsKey)) {
      stepsByReport.set(reportsKey, []);
    }
    stepsByReport.get(reportsKey)!.push(step);
  });

  // Convert to array of rows
  const rows = Array.from(stepsByReport.entries()).map(([reportsKey, steps]) => {
    return { reportLabel: reportsKey, steps };
  });

  rows.sort((a, b) => compareReportLabels(a.reportLabel, b.reportLabel));

  return (
    <div className="w-full overflow-x-auto">
      <Table className="w-full">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs font-semibold">Report</TableHead>
            <TableHead className="text-xs font-semibold">Steps</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ reportLabel, steps }) => (
            <TableRow key={reportLabel} className="hover:bg-transparent">
              <TableCell className="text-sm py-2 font-medium">{reportLabel}</TableCell>
              <TableCell className="text-sm py-2">
                <StepsList steps={steps} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
