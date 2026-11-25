import { ReportColumns, ReportHeading } from "@/features/page-speed-insights/shared/ReportColumns";
import { CriticalRequestChain } from "@/lib/schema";
import { Details } from "@/components/ui/accordion";
import { accordionSectionTitleClassName } from "@/components/ui/accordion-section-title-trigger";
import { TreeDataItem, TreeView } from "@/components/ui/tree-view";
import { formatBytes, formatMs } from "@/features/page-speed-insights/shared/format";

export function RenderCriticalChainData({
  reports,
}: {
  reports: Array<{ label: string; details?: CriticalRequestChain }>;
}) {
  const withChains = reports.filter((report) => report.details?.chains);
  if (!withChains.length) return null;
  return (
    <Details className="flex flex-col gap-2 print:border-0">
      <summary className="flex flex-col gap-2">
        <div className={accordionSectionTitleClassName}>Critical Request Chains</div>
      </summary>
      <ReportColumns>
        {withChains.map((report) => (
          <CriticalRequestChainSection
            key={report.label}
            details={report.details}
            device={report.label}
          />
        ))}
      </ReportColumns>
    </Details>
  );
}

function CriticalRequestChainSection({
  details,
  device,
}: {
  details?: CriticalRequestChain;
  device: string;
}) {
  if (!details) {
    return null;
  }

  return (
    <Details className="flex min-w-0 flex-col gap-2 print:border-0">
      <summary className="flex flex-col gap-2">
        <ReportHeading>{device}</ReportHeading>
        <div className="text-sm">
          Longest Chain: {formatMs(details.longestChain.duration)} with{" "}
          {details.longestChain.length} requests and {details.longestChain.transferSize} bytes
        </div>
      </summary>

      <TreeView data={chainToTree(details?.chains)} expandAll />
    </Details>
  );
}

function chainToTree(node: CriticalRequestChain["chains"]): TreeDataItem[] {
  return Object.entries(node).map(([key, value]) => {
    return {
      id: key,
      name: value.request.url,
      metrics: [
        { label: "Start", value: formatMs(value.request.startTime) },
        {
          label: "Segment",
          value: formatMs((value.request.endTime - value.request.startTime) * 1000),
        },
        { label: "Transfer", value: formatBytes(value.request.transferSize) },
      ],
      icon: undefined,
      selectedIcon: undefined,
      openIcon: undefined,
      draggable: false,
      droppable: false,
      children: value.children ? chainToTree(value.children) : undefined,
    };
  });
}
