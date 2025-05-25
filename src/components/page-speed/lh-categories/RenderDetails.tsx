import { Timeline } from '../Timeline';
import {
  AuditDetailFilmstrip,
  AuditDetailList,
  AuditResultsRecord,
  CriticalRequestChain,
  DebugData,
  TreeMapData,
} from '@/lib/schema';
import { RenderChecklist } from './RenderChecklist';
import { DetailTable2 } from './table/RenderTable';
import { RenderDebugData } from './RenderDebugdata';
import { RenderCriticalChainData } from './table/renderCricticalChain';
import { TableDataItem } from '../tsTable/TableDataItem';
import { JSUsageAccordion } from '../JSUsage/JSUsageSection';

export function RenderDetails({
  // auditData,
  // labels,
  items,
}: {
  // auditData?: (AuditResultsRecord[string] | null)[];
  // labels?: string[];
  items: TableDataItem[];
}) {
  const details = items.map((a) => a?.auditResult.details);
  const types = [...new Set(details.map((a) => a?.type).filter(Boolean))];
  const detailType = types[0];
  if (types.length !== 1 || !detailType) {
    return null;
  }
  const auditData = items.map((a) => a?.auditResult);
  const labels= items.map((a) => a?._userLabel);
  const title = auditData.find((a) => a?.title)?.title || '';

  switch (detailType) {
    case 'filmstrip':
      return (
        <>
          {details.map((ad, i) => (
            <Timeline
              key={`${i}_${labels[i]}`}
              timeline={ad as AuditDetailFilmstrip}
              device={labels[i]}
            />
          ))}
        </>
      );
    case 'list':
      return <RenderList rows={items} />;
    case 'checklist':
      return (
        <RenderChecklist
          desktopAuditData={auditData[1] as AuditResultsRecord['checklist']}
          mobileAuditData={auditData[0] as AuditResultsRecord['checklist']}
          title={title}
        />
      );
    case 'table':
    case 'opportunity':
      // @ts-expect-error need better type narrowing
      return <DetailTable2 rows={items} />;
    case 'criticalrequestchain':
      return (
        <div>
          Critical Request Chain
          <RenderCriticalChainData
            desktopDetails={details[1] as CriticalRequestChain}
            mobileDetails={details[2] as CriticalRequestChain}
          />
        </div>
      );
    // Internal-only details, not for rendering.
    case 'screenshot':
      return null;
    case 'debugdata':
      return (
        <RenderDebugData
          desktopDebugData={details[1] as DebugData}
          mobileDebugData={details[0] as DebugData}
        />
      );
    case 'treemap-data':
      return items.map((r, i) => (
        <JSUsageAccordion
          key={`${r.auditResult.id}_${i}`}
          treeData={r.auditResult?.details as TreeMapData}
          label={r._userLabel}
        />
      ));

    default:
      return null;
    // return <RenderUnknown details={desktopDetails} />;
  }
}

function RenderList({ rows }: { rows: TableDataItem[] }) {
  // const auditData = rows.map((a) => a?.auditResult);
  const details = rows.map((a) => a?.auditResult?.details);

  // Check if all details are of type 'list'
  if (!details.every((d) => d?.type === 'list')) {
    return null;
  }

  // Get the first non-null details to use as reference
  const referenceDetails = details.find((d) => d !== null);
  if (!referenceDetails) return null;

const items: TableDataItem[][] = rows
.map((r) => {
  const details = r?.auditResult?.details as AuditDetailList;
  return details?.items?.map((i) => ({
    ...r,
    auditResult: {
      ...r.auditResult,
      details: {
        ...details,
        ...i,
      },
    },
      
  })) || [];
}).reduce((acc: TableDataItem[][], c ) => {
  c.forEach((i, idx) => {
    acc[idx] = acc[idx] || [];
    if(Array.isArray(acc[idx])) {
      acc[idx].push(i);
    }
  })
  return acc;
}, [])

  return (
    <div>
      {items.map((item, index: number) => 
      <RenderDetails key={index} items={item} />
      )}
    </div>
  );
}
