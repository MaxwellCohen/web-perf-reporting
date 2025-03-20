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
  desktopAuditData,
  mobileAuditData,
}: {
  desktopAuditData?: AuditResultsRecord[string];
  mobileAuditData?: AuditResultsRecord[string];
}) {
  
  const desktopDetails = desktopAuditData?.details;
  const mobileDetails = mobileAuditData?.details;
  const detailType = desktopDetails?.type || mobileDetails?.type;
  const typesSet = new Set([desktopDetails?.type, mobileDetails?.type].filter(Boolean));
  if (typesSet.size !== 1 ) {
    return null;
  }
  const title = desktopAuditData?.title || mobileAuditData?.title || '';

  switch (detailType) {
    case 'filmstrip':
      return <Timeline timeline={desktopDetails as AuditDetailFilmstrip} device={'Desktop'} />;
    case 'list':
      return (
        <RenderList
          desktopAuditData={desktopAuditData}
          mobileAuditData={mobileAuditData}
        />
      );
    case 'checklist':
      return (
        <RenderChecklist
          desktopAuditData={desktopAuditData}
          mobileAuditData={mobileAuditData}
          title={title}
        />
      );
    case 'table':
    case 'opportunity':
      return (
        <DetailTable
          desktopDetails={desktopDetails as AuditDetailTable | AuditDetailOpportunity}
          mobileDetails={mobileDetails as AuditDetailTable | AuditDetailOpportunity}
          title={title}
        />
      );
    case 'criticalrequestchain':
      return (
        <div>
          Critical Request Chain
          <RenderCriticalChainData desktopDetails={desktopDetails as CriticalRequestChain} mobileDetails={mobileDetails as CriticalRequestChain} />
        </div>
      );
    // Internal-only details, not for rendering.
    case 'screenshot':
      return null;
    case 'debugdata':
      return <RenderDebugData desktopDebugData={desktopDetails as DebugData} mobileDebugData={mobileDetails as DebugData} />;
    case 'treemap-data':
      return (
        <RenderJSONDetails
          title={`${detailType} Data`}
          data={desktopAuditData}
          data2={mobileAuditData}
        />
      );

    default:
      return null;
      // return <RenderUnknown details={desktopDetails} />;
  }
}

function RenderList({
  desktopAuditData,
  mobileAuditData,
}: {
  desktopAuditData?: AuditResultsRecord[string];
  mobileAuditData?: AuditResultsRecord[string];
}) {
  if (desktopAuditData?.details?.type !== 'list') {
    return null;
  }
  if (mobileAuditData?.details?.type !== 'list') {
    return null;
  }
  const DesktopDetails = desktopAuditData?.details;
  const MobileDetails = mobileAuditData?.details;
  return (
    <div>
      {DesktopDetails.items.map((item, index: number) => {
        switch (item.type) {
          case 'table':
            return (
              <DetailTable
                key={index}
                desktopDetails={item}
                mobileDetails={
                  MobileDetails.items?.[index] as
                    | AuditDetailTable
                    | AuditDetailOpportunity
                }
                title={desktopAuditData.title || mobileAuditData.title}
              />
            );

          default:
            return <RenderUnknown key={index} details={DesktopDetails} />;
        }
      })}
    </div>
  );
}
