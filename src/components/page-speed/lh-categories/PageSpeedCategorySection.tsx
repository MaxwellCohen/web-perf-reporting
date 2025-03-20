"use client";
import { AuditResultsRecord, CategoryResult } from '@/lib/schema';
import { CategoryAuditSection } from './CategoryAuditSection';

export function PageSpeedCategorySection({
  desktopCategories,
  mobileCategories,
  desktopAuditRecords,
  mobileAuditRecords,
}: {
  desktopCategories?: Record<string, CategoryResult>;
  mobileCategories?: Record<string, CategoryResult>;
  desktopAuditRecords?: AuditResultsRecord | undefined;
  mobileAuditRecords?: AuditResultsRecord | undefined;
}) {
  const categoryKeys = [
    ...new Set<string>([
      ...Object.keys(desktopCategories || {}),
      ...Object.keys(mobileCategories || {}),
    ]),
  ];
  const categoryData = categoryKeys
    .map((key) => ({
      key,
      desktopCategory: desktopCategories?.[key],
      mobileCategory: mobileCategories?.[key],
    }))

  return (
    <>
      {categoryData.map(({ key, desktopCategory, mobileCategory }) => (
        <CategoryAuditSection
          key={key}
          categoryKey={key}
          desktopCategory={desktopCategory}
          mobileCategory={mobileCategory}
          desktopAuditRecords={desktopAuditRecords}
          mobileAuditRecords={mobileAuditRecords}
        />
      ))}
    </>
  );
}
