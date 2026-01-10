import { Details } from '@/components/ui/accordion';
import { RenderJSONDetails } from '@/components/page-speed/RenderJSONDetails';
import { AuditRef, AuditResultsRecord } from '@/lib/schema';
import { AuditDetailsSummary } from '@/components/page-speed/lh-categories/AuditDetailsSummary';
import { RenderMetricSavings } from '@/components/page-speed/lh-categories/RenderMetricSavings';
// import { RenderDetails } from './RenderDetails';
import { isEmptyResult } from '@/components/page-speed/ScoreDisplay';

const doNotRenderDetails = ['screenshot-thumbnails', 'main-thread-tasks'];

export function AuditDetailsSection({
  auditRef,
  auditsRecords,
  labels,
  acronym,
}: {
  auditRef?: AuditRef;
  auditsRecords: (AuditResultsRecord | null)[];
  labels: string[];
  desktopAuditRecords?: AuditResultsRecord;
  mobileAuditRecords?: AuditResultsRecord;
  acronym?: string;
}) {
  const auditRefId = auditRef?.id;
  if (!auditRefId) return null;
  const auditData = auditsRecords.map((d) => d?.[auditRefId] || null);

  const scoreDisplayMode =
    auditData.find((d) => d?.scoreDisplayMode)?.scoreDisplayMode || 'bottom';

  const emptyTable = auditData.every((d) => isEmptyResult(d));

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
            auditData={auditData}
            labels={labels}
            acronym={acronym}
          />

          <RenderJSONDetails
            className="text-right"
            data={auditData[0]}
            data2={auditData[1]}
            title={`All Data for ${auditRef?.id}`}
          />
        </div>
      </div>
    );
  }

  return (
    <Details id={auditRefId} className="rounded-2 mb-4 rounded-md border-4 p-2">
      <summary className="flex flex-col gap-4">
        <AuditDetailsSummary
          auditData={auditData}
          labels={labels}
          acronym={auditRef?.acronym}
        />
        <RenderJSONDetails
          className="text-right"
          data={auditData[0]}
          data2={auditData[1]}
          title={`All Data for ${auditRef?.id}`}
        />
      </summary>
      {!disabled ? (
        <>
          <RenderMetricSavings auditData={auditData} labels={labels} />
          {/* <RenderDetails auditData={auditData} labels={labels} /> */}
        </>
      ) : null}
    </Details>
  );
}
