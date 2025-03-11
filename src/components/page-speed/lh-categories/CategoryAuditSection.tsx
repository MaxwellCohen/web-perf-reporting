/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Accordion,
} from '../../ui/accordion';
import { sortByScoreDisplayModes } from '../ScoreDisplay';
import {
  AuditResultsRecord,
  CategoryResult,
} from '@/lib/schema';
import { CategoryScoreInfo } from './CategoryScoreInfo';
import { AuditDetailsSection } from './AuditDetailsSection';

export function CategoryAuditSection({
  categoryKey,
  mobileCategory,
  desktopCategory,
  desktopAuditRecords,
  mobileAuditRecords,
}: {
  mobileCategory?: CategoryResult | null;
  desktopCategory?: CategoryResult | null;
  categoryKey: string;
  desktopAuditRecords?: AuditResultsRecord;
  mobileAuditRecords?: AuditResultsRecord;
}) {
  if (!desktopCategory || !mobileCategory) {
    return null;
  }
  return (
    <AccordionItem key={categoryKey} value={categoryKey}>
      <AccordionTrigger className="flex flex-row justify-start gap-2 text-lg font-bold">
        <div className="flex flex-1 flex-row flex-wrap items-center justify-between">
          <div className="flex w-[200px] whitespace-nowrap group-hover:underline">
            {desktopCategory?.title || mobileCategory?.title}
          </div>
          <CategoryScoreInfo category={mobileCategory} device="Mobile" />
          <CategoryScoreInfo category={desktopCategory} device="Desktop" />
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="w-full" role="table" aria-label="Audit Table">
          {desktopCategory.auditRefs && desktopAuditRecords ? (
            <Accordion type="multiple">
              {desktopCategory.auditRefs
                .filter((auditRef) => {
                  if (!auditRef.id) {
                    return false;
                  }
                  if (auditRef.group === 'metrics') {
                    return false;
                  }
                  if (!auditRef.id) {
                    return null;
                  }
                  
                  const desktopAuditData = desktopAuditRecords?.[auditRef.id];
                  const mobileAuditData = mobileAuditRecords?.[auditRef.id];
                  if (!desktopAuditData && !mobileAuditData) {
                    return null;
                  }
                  if (
                    desktopAuditData?.details?.type !==
                    mobileAuditData?.details?.type
                  ) {
                    return null;
                  }

                  if (desktopAuditData?.details?.type === 'filmstrip') {
                    return null;
                  }
                  if (!desktopAuditData && !mobileAuditData) {
                    return false;
                  }
                  if (
                    desktopAuditData?.details?.type !==
                    mobileAuditData?.details?.type
                  ) {
                    return false;
                  }

                  return true;
                })
                .sort((a, b) => {
                  const aDetails =
                    desktopAuditRecords?.[a.id || ''] ||
                    mobileAuditRecords?.[a.id || ''];
                  const bDetails =
                    desktopAuditRecords?.[b.id || ''] ||
                    mobileAuditRecords?.[b.id || ''];

                  return sortByScoreDisplayModes(aDetails, bDetails);
                })
                .map((auditRef) => (
                  <AuditDetailsSection
                    key={auditRef.id}
                    auditRef={auditRef}
                    desktopAuditRecords={desktopAuditRecords || {}}
                    mobileAuditRecords={mobileAuditRecords || {}}
                    acronym={auditRef.acronym}
                  />
                ))}
            </Accordion>
          ) : null}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
