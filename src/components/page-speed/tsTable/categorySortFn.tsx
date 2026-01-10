import { TableDataItem } from '@/components/page-speed/tsTable/TableDataItem';

const categoryOrder: Record<string, number> = {
  'Core Web Vitals': 1,
  performance: 2,
  accessibility: 3,
  'best-practices': 4,
  seo: 5,
  unknown: 6,
};

export function categorySortFn(
  rowA: { original: TableDataItem; },
  rowB: { original: TableDataItem; }
): number {
  const categoryA = rowA.original._category?.id;
  const categoryB = rowB.original._category?.id;
  const orderA = categoryOrder[categoryA || 'unknown'];
  const orderB = categoryOrder[categoryB || 'unknown'];

  if (orderA < orderB) {
    return -1;
  }
  if (orderA > orderB) {
    return 1;
  }
  return 0; // They're equal, keep original order
}
