import { RenderJSONDetails } from '../RenderJSONDetails';
import { Timeline } from '../Timeline';
import {
  AuditDetailFilmstrip,
  AuditDetailOpportunity,
  AuditDetailTable,
  AuditResultsRecord,
  CriticalRequestChain,
  DebugData,
} from '@/lib/schema';
import { RenderChecklist } from './RenderChecklist';
import { RenderUnknown } from './RenderUnknown';
import { DetailTable } from './table/RenderTable';
import { RenderDebugData } from './RenderDebugdata';
import { RenderCriticalChainData } from './table/renderCricticalChain';

export function RenderDetails({
  auditData,
  labels,
}: {
  auditData: (AuditResultsRecord[string] | null)[];
  labels: string[];
}) {
  const details = auditData.map((a) => a?.details);
  const types = [...new Set(details.map((a) => a?.type).filter(Boolean))];
  const detailType = types[0];
  if (types.length !== 1 || !detailType) {
    return null;
  }
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
      //labels={labels}
      return <RenderList auditData={auditData}  />;
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
      return (
        <DetailTable
          desktopDetails={
            details[1]  as AuditDetailTable | AuditDetailOpportunity
          }
          mobileDetails={
            details[0] as AuditDetailTable | AuditDetailOpportunity
          }
          title={title}
        />
      );
    case 'criticalrequestchain':
      return (
        <div>
          Critical Request Chain
          <RenderCriticalChainData
            desktopDetails={details[1]as CriticalRequestChain}
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
          desktopDebugData={details[1]as DebugData}
          mobileDebugData={details[0] as DebugData}
        />
      );
    case 'treemap-data':
      return (
        <RenderJSONDetails
          title={`${detailType} Data`}
          data={details[0]}
          data2={details[1]}
        />
      );

    default:
      return null;
    // return <RenderUnknown details={desktopDetails} />;
  }
}

function RenderList({
  auditData,
  // labels,
}: {
  auditData: (AuditResultsRecord[string] | null)[];
  // labels: string[];
}) {
  const details = auditData.map((a) => a?.details);

  // Check if all details are of type 'list'
  if (!details.every((d) => d?.type === 'list')) {
    return null;
  }

  // Get the first non-null details to use as reference
  const referenceDetails = details.find((d) => d !== null);
  if (!referenceDetails) return null;

  return (
    <div>
      {referenceDetails.items.map((item, index: number) => {
        switch (item.type) {
          case 'table':
            return (
              <DetailTable
                key={index}
                desktopDetails={
                  details[0]?.items?.[index] as
                    | AuditDetailTable
                    | AuditDetailOpportunity
                }
                mobileDetails={
                  details[1]?.items?.[index] as
                    | AuditDetailTable
                    | AuditDetailOpportunity
                }
                title={auditData.find((a) => a?.title)?.title || ''}
              />
            );

          default:
            return <RenderUnknown key={index} details={item[0]} />;
        }
      })}
    </div>
  );
}
