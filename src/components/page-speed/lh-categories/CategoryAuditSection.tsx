import { Details } from '@/components/ui/accordion';
import { sortByScoreDisplayModes } from '@/components/page-speed/ScoreDisplay';
import { AuditResultsRecord, CategoryResult } from '@/lib/schema';
import { CategoryScoreInfo } from '@/components/page-speed/lh-categories/CategoryScoreInfo';
import { AuditDetailsSection } from '@/components/page-speed/lh-categories/AuditDetailsSection';
import { useMemo } from 'react';

const AuditRefsToHide = ['final-screenshot', 'script-treemap-data'];

export function CategoryAuditSection({
  category,
  auditsRecords,
  labels,
}: {
  category: (CategoryResult | null)[];
  auditsRecords: (AuditResultsRecord | null)[];
  labels: string[];
}) {
  const hasData = category?.some((category) => !!category);
  const auditRefs = useMemo(
    () =>
      category
        .map((c) => c?.auditRefs || [])
        .reduce((acc, c) => [...acc, ...c], [])
        .filter(
          (auditRef, index, arr) =>
            arr.findIndex((a) => a.id === auditRef.id) === index,
        ),
    [category],
  );

  if (!category || !hasData) {
    return null;
  }

  const title = category.find((c) => c?.title)?.title;

  return (
    <Details className="flex flex-col gap-2">
      <summary className="flex flex-row justify-start gap-2 text-lg font-bold">
        <div className="flex flex-1 flex-row flex-wrap items-center justify-between">
          <div className="flex w-[200px] whitespace-nowrap group-hover:underline">
            {title}
          </div>
          {category.filter(Boolean).map((c, i) => (
            <CategoryScoreInfo
              key={`${i}_${c?.title}`}
              category={c}
              device={labels[i] || ''}
            />
          ))}
          {/* 
          <CategoryScoreInfo category={desktopCategory} device="Desktop" /> */}
        </div>
      </summary>
      <div className="w-full" role="table" aria-label="Audit Table">
        {auditRefs.length ? (
          <div>
            {auditRefs
              .filter((auditRef) => {
                // should be an auditRef.id and not be metrics group
                const id = auditRef?.id;
                if (
                  !id ||
                  auditRef.group === 'metrics' ||
                  AuditRefsToHide.includes(id)
                ) {
                  return false;
                }
                const auditDataArr = auditsRecords.map((audit) => audit?.[id]);
                const hasAuditDAta = auditDataArr?.some((a) => !!a);
                if (!hasAuditDAta) {
                  return false;
                }

                const detailsType = auditDataArr.find((a) => a?.details?.type)
                  ?.details?.type;

                if (detailsType === 'filmstrip') {
                  return false;
                }

                return true;
              })
              .sort((a, b) => {
                const aDetails =
                  auditsRecords.find((au) => au?.[a.id || ''])?.[a.id || ''] ??
                  undefined;
                const bDetails =
                  auditsRecords.find((au) => au?.[b.id || ''])?.[b.id || ''] ??
                  undefined;

                return sortByScoreDisplayModes(aDetails, bDetails);
              })
              .map((auditRef) => (
                <AuditDetailsSection
                  key={auditRef.id}
                  auditRef={auditRef}
                  auditsRecords={auditsRecords}
                  labels={labels}
                />
              ))}
          </div>
        ) : null}
      </div>
    </Details>
  );
}
