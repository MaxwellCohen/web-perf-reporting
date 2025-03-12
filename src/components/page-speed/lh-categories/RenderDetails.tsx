import { RenderJSONDetails } from '../RenderJSONDetails';
import { Timeline } from '../Timeline';
import {
  AuditDetailOpportunity,
  AuditDetailTable,
  AuditResultsRecord,
} from '@/lib/schema';
import { RenderChecklist } from './RenderChecklist';
import { RenderUnknown } from './RenderUnknown';
import { DetailTable } from './table/RenderTable';

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
        />
      );
    case 'table':
    case 'opportunity':
      console.log('table', desktopDetails);
      return (
        <DetailTable
          desktopDetails={desktopDetails}
          mobileDetails={mobileDetails as AuditDetailTable | AuditDetailOpportunity}
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
        console.log('item', item);
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
              />
            );

          default:
            return <RenderUnknown key={index} details={DesktopDetails} />;
        }
      })}
    </div>
  );
}
