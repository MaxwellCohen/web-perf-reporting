import { AuditResult, CategoryResult } from '@/lib/schema';
import { CategoryAuditSection } from './CategoryAuditSection';

export function PageSpeedCategorySection({
  desktopCategories,
  mobileCategories,
  desktopAuditRecords,
  mobileAuditRecords,
}: {
  desktopCategories?: Record<string, CategoryResult>;
  mobileCategories?: Record<string, CategoryResult>;
  desktopAuditRecords: AuditResult | undefined;
  mobileAuditRecords: AuditResult | undefined;
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
    .filter(({ desktopCategory, mobileCategory }) => {
      if (!desktopCategory && !mobileCategory) {
        return false;
      }
      if (desktopCategory?.id && mobileCategory?.id) {
        return desktopCategory.id === mobileCategory.id;
      }
      return true;
    });

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
