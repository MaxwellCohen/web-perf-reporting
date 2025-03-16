import { RenderJSONDetails } from '../RenderJSONDetails';
import { Timeline } from '../Timeline';
import {
  AuditDetailOpportunity,
  AuditDetailTable,
  AuditResultsRecord,
  DebugData,
} from '@/lib/schema';
import { RenderChecklist } from './RenderChecklist';
import { RenderUnknown } from './RenderUnknown';
import { DetailTable } from './table/RenderTable';
import { RenderDebugData } from './RenderDebugdata';

export function RenderDetails({
  desktopAuditData,
  mobileAuditData,
}: {
  desktopAuditData?: AuditResultsRecord[string];
  mobileAuditData?: AuditResultsRecord[string];
}) {
  if (!desktopAuditData?.details?.type || !mobileAuditData?.details?.type) {
    return null;
  }
  const desktopDetails = desktopAuditData.details;
  const mobileDetails = mobileAuditData.details;
  if (desktopDetails.type !== mobileDetails.type) {
    return null;
  }

  switch (desktopDetails.type) {
    case 'filmstrip':
      return <Timeline timeline={desktopDetails} device={'Desktop'} />;
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
          title={desktopAuditData.title || mobileAuditData.title}
        />
      );
    case 'table':
    case 'opportunity':
      return (
        <DetailTable
          desktopDetails={desktopDetails}
          mobileDetails={mobileDetails as AuditDetailTable | AuditDetailOpportunity}
          title={desktopAuditData.title || mobileAuditData.title}
        />
      );
    case 'criticalrequestchain':
      return (
        <div>
          Critical Request Chain
          <pre>{JSON.stringify(desktopDetails, null, 2)}</pre>
        </div>
      );
    // Internal-only details, not for rendering.
    case 'screenshot':
      return null;
    case 'debugdata':
      return <RenderDebugData desktopDebugData={desktopDetails} mobileDebugData={mobileDetails as DebugData} />;
    case 'treemap-data':
      return (
        <RenderJSONDetails
          title={`${desktopDetails.type} Data`}
          data={desktopAuditData}
          data2={mobileAuditData}
        />
      );

    default:
      return <RenderUnknown details={desktopDetails} />;
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
