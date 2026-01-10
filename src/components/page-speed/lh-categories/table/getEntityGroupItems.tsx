import { TableItem, TableColumnHeading, ItemValueType } from '@/lib/schema';
import { SUMMABLE_VALUETYPES } from '@/components/page-speed/lh-categories/table/utils';

export function getTableItemSortComparator(sortedBy: string[]) {
  return (a: TableItem, b: TableItem) => {
    for (const key of sortedBy) {
      const aVal = a[key];
      const bVal = b[key];
      if (
        typeof aVal === 'number' &&
        typeof bVal === 'number' &&
        aVal !== bVal
      ) {
        return bVal - aVal;
      }
      if (
        typeof aVal === 'string' &&
        typeof bVal === 'string' &&
        aVal !== bVal
      ) {
        return aVal.localeCompare(bVal);
      }
    }
    return 0;
  };
}

export function shouldGroupEntity(items: TableItem[], isEntityGrouped: boolean) {
  return !(!items.length || isEntityGrouped || !items.some((item) => item.entity))
}

export const getEntityGroupItems = ({
  items,
  headings = [],
  isEntityGrouped,
  skipSumming,
  sortedBy,
}: {
  items: TableItem[];
  headings?: TableColumnHeading[];
  isEntityGrouped: boolean;
  skipSumming: string[];
  sortedBy?: string[];
}) => {
  // Exclude entity-grouped audits and results without entity classification
  if (shouldGroupEntity(items, isEntityGrouped)) {
    return [];
  }

  const skippedColumns = new Set(skipSumming);
  const summableColumns: string[] = [];

  for (const heading of headings) {
    if (!heading.key || skippedColumns.has(heading.key)) continue;
    if (SUMMABLE_VALUETYPES.includes(heading.valueType as ItemValueType)) {
      summableColumns.push(heading.key);
    }
  }

  const firstColumnKey = headings[0].key;
  if (!firstColumnKey) return [];

  const byEntity = new Map<string | undefined, TableItem>();

  for (const item of items) {
    const entityName =
      typeof item.entity === 'string' ? item.entity : undefined;
    const groupedItem = byEntity.get(entityName) || {
      [firstColumnKey]: entityName || 'Unattributable',
      entity: entityName,
    };

    for (const key of summableColumns) {
      groupedItem[key] = Number(groupedItem[key] || 0) + Number(item[key] || 0);
    }
    byEntity.set(entityName, groupedItem);
  }

  const result = Array.from(byEntity.values());
  if (sortedBy) {
    result.sort(getTableItemSortComparator(sortedBy));
  }
  return result;
};
