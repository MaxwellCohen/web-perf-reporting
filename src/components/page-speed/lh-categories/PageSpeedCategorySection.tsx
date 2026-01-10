"use client";
import { NullablePageSpeedInsights } from '@/lib/schema';
import { CategoryAuditSection } from '@/components/page-speed/lh-categories/CategoryAuditSection';

export function PageSpeedCategorySection({
  data,
  labels,
  // labels,
}: {
  data: NullablePageSpeedInsights[];
  labels: string[];
}) {
  const categories = data.map((d) => d?.lighthouseResult?.categories || null);
  const audits = data.map((d) => d?.lighthouseResult?.audits || null);
  const categoryKeys = [
    ...new Set<string>(
      categories.reduce((acc, curr) => {
        if (!curr) return acc;
        return [...acc, ...Object.keys(curr)];
      }, [] as string[])
    ),
  ];
  const categoryData = categoryKeys
    .map((key) => ({
      key,
      categoryArr: categories.map((category) => category?.[key] || null),
    }))

  return (
    <>
      {categoryData.map(({ key, categoryArr }) => (
        <CategoryAuditSection
          key={key}
          category={categoryArr}
          labels={labels}
          auditsRecords={audits}
        />
      ))}
    </>
  );
}
