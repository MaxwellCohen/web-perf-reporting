import { TableItem } from '@/lib/schema';

export function mergeTableItem(a: TableItem, b: TableItem): TableItem {
  return {
    ...a,
    ...b,
    ...(a.subItems
      ? {
          subItems: {
            type: 'subitems',
            items: [
              ...(a.subItems.items || []),
              ...(b.subItems?.items || []),
            ].reduce(reduceTableItems, []),
          },
        }
      : {}),
  };
}

export function reduceTableItems(acc: TableItem[], item: TableItem) {
  const groupByID = makeID(item);
  console.log('groupByID', groupByID);
  if (!groupByID) {
    acc.push(item);
    return acc;
  }
  const inArrayIndex = acc.findIndex((i) => makeID(i) === groupByID);
  if (inArrayIndex !== -1) {
    acc[inArrayIndex] = mergeTableItem(acc[inArrayIndex], item);
  } else {
    acc.push(item);
  }

  return acc;
}

export const makeID = (i: TableItem) =>
  Object.entries(i)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => {
      if (typeof v === 'string' && k !== '_device') {
        return `${k}|${v}`;
      }
      return '';
    })
    .filter(Boolean)
    .join(',');
