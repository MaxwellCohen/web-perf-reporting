import { DeviceType, TableColumnHeading, TableItem } from '@/lib/schema';
import { reduceTableItems } from './reduceTableItems';
import { renameKeys } from './renameKeys';
import { ItemValueType } from '@/lib/schema';

export const SUMMABLE_VALUETYPES: ItemValueType[] = [
  'bytes',
  'numeric',
  'ms',
  'timespanMs',
];

export function getDerivedSubItemsHeading(
  heading: TableColumnHeading,
): TableColumnHeading | null {
  if (!heading.subItemsHeading) return null;
  return {
    key: heading.subItemsHeading.key || null,
    valueType: heading.subItemsHeading.valueType || heading.valueType,
    granularity: heading.subItemsHeading.granularity || heading.granularity,
    displayUnit: heading.subItemsHeading.displayUnit || heading.displayUnit,
    label: '',
  };
}

export function mergedTable(
  desktopItems?: TableItem[],
  mobileItems?: TableItem[],
  mobileHeadings?: TableColumnHeading[],
  desktopHeadings?: TableColumnHeading[],
): [TableColumnHeading[], TableItem[], DeviceType] {
  let headings: TableColumnHeading[] = [];
  let items: TableItem[] = [];
  let device: DeviceType = 'Desktop';
  if (!desktopItems && !mobileItems) {
    return [[], [], 'Desktop'] as const;
  }
  const mItems = (mobileItems || []).map((i) => renameKeys(i, 'Mobile'));
  const dItems = (desktopItems || []).map((i) => renameKeys(i, 'Desktop'));
  if (!desktopItems?.length && mItems?.length) {
    headings = mergeHeadings(mobileHeadings || []);
    headings = mobileHeadings || [];
    items = mItems;
    device = 'Mobile';
  } else if (!mobileItems?.length && dItems?.length) {
    headings = mergeHeadings([], desktopHeadings || []);
    items = dItems;
  } else if (dItems?.length && mItems?.length) {
    headings = mergeHeadings(mobileHeadings, desktopHeadings);
    items = [...mItems, ...dItems].reduce(reduceTableItems, []);
  }
  return [headings, items, device] as const;
}

export function mergeHeadings(
  mobileHeadings?: TableColumnHeading[],
  desktopHeadings?: TableColumnHeading[],
) {
  const headings: TableColumnHeading[] = [];
  const mHeadings = (mobileHeadings || []).map((heading) =>
    updateTableHeading(heading, 'Mobile'),
  );
  const dHeadings = (desktopHeadings || []).map((heading) =>
    updateTableHeading(heading, 'Desktop'),
  );
  while (mHeadings.length || dHeadings.length) {
    let i = mHeadings.shift();
    if (i) {
      headings.push(i);
    }
    i = dHeadings.shift();
    if (i) {
      headings.push(i);
    }
  }
  return headings.filter(
    (heading, i, Arr) => Arr.findIndex((t) => t.key === heading.key) === i,
  );
}

export function updateTableHeading(
  heading: TableColumnHeading,
  device: DeviceType,
): TableColumnHeading {
  if (!showBothDevices(heading)) {
    return heading;
  }

  return {
    key: heading.key ? `${heading.key}-${device}` : null,
    label: `${heading.label}`,
    valueType: heading.valueType,
    granularity: heading.granularity,
    displayUnit: heading.displayUnit,
    _device: device,
    ...(heading.subItemsHeading
      ? {
          subItemsHeading: getDerivedSubItemsHeading(heading)
            ? updateTableHeading(
                getDerivedSubItemsHeading(heading) as TableColumnHeading,
                device,
              )
            : undefined,
        }
      : {}),
  } as TableColumnHeading;
}

export function showBothDevices(heading: TableColumnHeading) {
  return SUMMABLE_VALUETYPES.includes(heading.valueType as ItemValueType);
}
