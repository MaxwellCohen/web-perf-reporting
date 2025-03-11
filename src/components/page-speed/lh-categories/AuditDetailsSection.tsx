import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../../ui/accordion';
import { RenderJSONDetails } from '../RenderJSONDetails';
import { AuditRef, AuditResultsRecord } from '@/lib/schema';
import { AuditDetailsSummary } from './AuditDetailsSummary';
import { RenderMetricSavings } from './RenderMetricSavings';
import { RenderDetails } from './RenderDetails';
import { isEmptyResult } from '../ScoreDisplay';



export function AuditDetailsSection({
  auditRef,
  desktopAuditRecords,
  mobileAuditRecords,
  acronym,
}: {
  auditRef: AuditRef;
  desktopAuditRecords: AuditResultsRecord;
  mobileAuditRecords: AuditResultsRecord;
  acronym?: string;
}) {
  const desktopAuditData = desktopAuditRecords?.[auditRef.id || ''];
  const mobileAuditData = mobileAuditRecords?.[auditRef.id || ''];
  const scoreDisplayMode =
    desktopAuditData.scoreDisplayMode ||
    mobileAuditData.scoreDisplayMode ||
    'bottom';

  const emptyTable =
    isEmptyResult(desktopAuditData) && isEmptyResult(mobileAuditData);

  const disabled =
    emptyTable ||
    ['notApplicable', 'manual', 'bottom'].includes(scoreDisplayMode);

  return (
    <AccordionItem key={desktopAuditData.id} value={desktopAuditData.id}>
      <AccordionTrigger className="flex flex-row gap-4" disabled={disabled}>
        <AuditDetailsSummary
          desktopAuditData={desktopAuditData}
          mobileAuditData={mobileAuditData}
          acronym={acronym}
        />
      </AccordionTrigger>
      <RenderJSONDetails data={desktopAuditData} data2={mobileAuditData} title={`All Data for ${auditRef.id}`} />
      <AccordionContent>
        <RenderMetricSavings
          desktopAuditData={desktopAuditData}
          mobileAuditData={mobileAuditData}
        />
        <RenderDetails
          desktopAuditData={desktopAuditData}
          mobileAuditData={mobileAuditData}
        />
      </AccordionContent>
    </AccordionItem>
  );
}
