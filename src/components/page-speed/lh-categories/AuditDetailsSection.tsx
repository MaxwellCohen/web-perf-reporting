import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../../ui/accordion';
import { RenderJSONDetails } from '../RenderJSONDetails';
import {
  AuditRef,
  AuditResult,
} from '@/lib/schema';
import { AuditDetailsSummary } from './AuditDetailsSummary';
import { RenderMetricSavings } from './RenderMetricSavings';
import { RenderDetails } from './RenderDetails';

export function AuditDetailsSection({
  auditRef,
  desktopAuditRecords,
  mobileAuditRecords,
  acronym,
}: {
  auditRef: AuditRef;
  desktopAuditRecords: AuditResult;
  mobileAuditRecords: AuditResult;
  acronym?: string;
}) {
  const desktopAuditData = desktopAuditRecords?.[auditRef.id || ''];
  const mobileAuditData = mobileAuditRecords?.[auditRef.id || ''];
  const scoreDisplayMode =
    desktopAuditData.scoreDisplayMode ||
    mobileAuditData.scoreDisplayMode ||
    'numeric';

  let emptyTable = false;
  if (
    desktopAuditData.details?.type === 'table' &&
    desktopAuditData.details.items.length === 0 &&
    mobileAuditData.details?.type === 'table' &&
    mobileAuditData.details.items.length === 0
  ) {
    emptyTable = true;
  }
  if (
    desktopAuditData.details?.type === 'opportunity' &&
    desktopAuditData.details.items.length === 0 &&
    mobileAuditData.details?.type === 'opportunity' &&
    mobileAuditData.details.items.length === 0
  ) {
    emptyTable = true;
  }
  const noDetails = !desktopAuditData.details && !mobileAuditData.details;

  const disabled =
    emptyTable ||
    noDetails ||
    ['notApplicable', 'manual'].includes(scoreDisplayMode);

  return (
    <AccordionItem key={desktopAuditData.id} value={desktopAuditData.id}>
      <AccordionTrigger className="flex flex-row gap-4" disabled={disabled}>
        <AuditDetailsSummary
          desktopAuditData={desktopAuditData}
          mobileAuditData={mobileAuditData}
          acronym={acronym}
        />
      </AccordionTrigger>
      <RenderJSONDetails data={{ desktopAuditData, mobileAuditData }} />
      <AccordionContent>
        <RenderMetricSavings auditData={desktopAuditData} />
        <RenderDetails
          desktopAuditData={desktopAuditData}
          mobileAuditData={mobileAuditData}
        />
      </AccordionContent>
    </AccordionItem>
  );
}

