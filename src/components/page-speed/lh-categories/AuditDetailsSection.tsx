import {
  Details,
} from '../../ui/accordion';
import { RenderJSONDetails } from '../RenderJSONDetails';
import { AuditRef, AuditResultsRecord } from '@/lib/schema';
import { AuditDetailsSummary } from './AuditDetailsSummary';
import { RenderMetricSavings } from './RenderMetricSavings';
import { RenderDetails } from './RenderDetails';
import { isEmptyResult } from '../ScoreDisplay';

const doNotRenderDetails = ['screenshot-thumbnails', 'main-thread-tasks'];

export function AuditDetailsSection({
  auditRef,
  desktopAuditRecords,
  mobileAuditRecords,
  acronym,
}: {
  auditRef?: AuditRef;
  desktopAuditRecords?: AuditResultsRecord;
  mobileAuditRecords?: AuditResultsRecord;
  acronym?: string;
}) {
  const auditRefId = auditRef?.id || 'NOT_FOUND_ID!!!!';
  const desktopAuditData = desktopAuditRecords?.[auditRefId];
  const mobileAuditData = mobileAuditRecords?.[auditRefId];
  const scoreDisplayMode =
    desktopAuditData?.scoreDisplayMode ||
    mobileAuditData?.scoreDisplayMode ||
    'bottom';

  const emptyTable =
    isEmptyResult(desktopAuditData) && isEmptyResult(mobileAuditData);

  const doNotRender = doNotRenderDetails.includes(auditRefId);
  const disabled =
    doNotRender ||
    emptyTable ||
    ['notApplicable', 'manual', 'bottom'].includes(scoreDisplayMode);

  if (disabled) {
    return (
      <div className="rounded-2 mb-4 rounded-md border-4 p-2">
        <div className="flex flex-col gap-4">
          <AuditDetailsSummary
            desktopAuditData={desktopAuditData}
            mobileAuditData={mobileAuditData}
            acronym={acronym}
          />
          <RenderJSONDetails
            className="text-right"
            data={desktopAuditData}
            data2={mobileAuditData}
            title={`All Data for ${auditRef?.id}`}
          />
        </div>
      </div>
    );
  }

  return (
    <Details
      id={desktopAuditData?.id || mobileAuditData?.id}
      className="rounded-2 mb-4 rounded-md border-4 p-2"
    >
      <summary className="flex flex-col gap-4">
        <AuditDetailsSummary
          desktopAuditData={desktopAuditData}
          mobileAuditData={mobileAuditData}
          acronym={acronym}
        />
        <RenderJSONDetails
          className="text-right"
          data={desktopAuditData}
          data2={mobileAuditData}
          title={`All Data for ${auditRef?.id}`}
        />
      </summary>
      {!disabled ? (
        <>
          <RenderMetricSavings
            desktopAuditData={desktopAuditData}
            mobileAuditData={mobileAuditData}
          />
          <RenderDetails
            desktopAuditData={desktopAuditData}
            mobileAuditData={mobileAuditData}
          />
        </>
      ) : null}
    </Details>
  );
}
