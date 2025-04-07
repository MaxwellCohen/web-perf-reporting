import {
  Details,
} from '@/components/ui/accordion';
import { sortByScoreDisplayModes } from '../ScoreDisplay';
import {
  AuditResultsRecord,
  CategoryResult,
} from '@/lib/schema';
import { CategoryScoreInfo } from './CategoryScoreInfo';
import { AuditDetailsSection } from './AuditDetailsSection';


const AuditRefsToHide = ['final-screenshot', 'script-treemap-data'];

export function CategoryAuditSection({
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
  if (!desktopCategory && !mobileCategory) {
    return null;
  }

  const auditRefs = [...(desktopCategory?.auditRefs || []), ...(mobileCategory?.auditRefs || [])].filter(
    (auditRef, index, arr) => arr.findIndex((a) => a.id === auditRef.id) === index,
  );


  return (
    <Details className="flex flex-col gap-2">
      <summary className="flex flex-row justify-start gap-2 text-lg font-bold">
        <div className="flex flex-1 flex-row flex-wrap items-center justify-between">
          <div className="flex w-[200px] whitespace-nowrap group-hover:underline">
            {desktopCategory?.title || mobileCategory?.title}
          </div>
          <CategoryScoreInfo category={mobileCategory} device="Mobile" />
          <CategoryScoreInfo category={desktopCategory} device="Desktop" />
        </div>
      </summary>
        <div className="w-full" role="table" aria-label="Audit Table">
          {auditRefs.length ? (
            <div>
              {auditRefs
                .filter((auditRef) => {
                 // should be an auditRef.id and not be metrics group
                  if (!auditRef.id || auditRef.group === 'metrics' || AuditRefsToHide.includes(auditRef.id) ) {
                    return false;
                  }
                 
                  
                  const desktopAuditData = desktopAuditRecords?.[auditRef.id];
                  const mobileAuditData = mobileAuditRecords?.[auditRef.id];
                  
                  if (!desktopAuditData && !mobileAuditData) {
                    return false;
                  }
                  const detailsType = desktopAuditData?.details?.type || mobileAuditData?.details?.type;

                  if (detailsType === 'filmstrip') {
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
            </div>
          ) : null}
        </div>
    </Details>
  );
}
