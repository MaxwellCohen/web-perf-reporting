import { CriticalRequestChain } from '@/lib/schema';
import { Details } from '@/components/ui/accordion';
import { TreeDataItem, TreeView } from '@/components/ui/tree-view';
import { renderTimeValue } from './RenderTableValue';

export function RenderCriticalChainData({
  desktopDetails,
  mobileDetails,
}: {
  desktopDetails?: CriticalRequestChain;
  mobileDetails?: CriticalRequestChain;
}) {
  return (
    <Details className="flex flex-col gap-2 print:border-0">
      <summary className="flex flex-col gap-2">
        <div className="text-lg font-bold group-hover:underline">
          Critical Request Chains
        </div>
      </summary>
      {mobileDetails?.chains ? (
        <CriticalRequestChainSection details={mobileDetails} device="Mobile" />
      ) : null}
      {desktopDetails?.chains ? (
                <CriticalRequestChainSection details={desktopDetails} device="Desktop" />
      ) : null}
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
    <Details className="flex flex-col gap-2 print:border-0">
      <summary className="flex flex-col gap-2">
        <div className="text-lg font-bold">
          Critical Request Chains for {device}
        </div>
        <div className="text-sm">
          Longest Chain: {renderTimeValue(details.longestChain.duration)} with{' '}
          {details.longestChain.length} requests and{' '}
          {details.longestChain.transferSize} bytes
        </div>
      </summary>

      <TreeView data={chainToTree(details?.chains)} expandAll />
    </Details>
  );
}

function chainToTree(node: CriticalRequestChain['chains']): TreeDataItem[] {
  return Object.entries(node).map(([key, value]) => {
    return {
      id: key,
      name: `${value.request.url} | Start Time ${renderTimeValue((value.request.startTime))} | Segment Time ${renderTimeValue((value.request.endTime - value.request.startTime) * 1000)} | Transfer Amount ${value.request.transferSize} bytes`,
      icon: undefined,
      selectedIcon: undefined,
      openIcon: undefined,
      draggable: false,
      droppable: false,
      children: value.children ? chainToTree(value.children) : undefined,
    };
  });
}
