import { TableItem } from '@/lib/schema';


export function renameKeys(obj: TableItem, device: 'Desktop' | 'Mobile'): TableItem {
  return {
    ...obj,
    ...Object.entries(obj).reduce((acc: TableItem, [key, value]) => {
      if (typeof value === 'number') {
        acc[`${key}-${device}`] = value;
      }
      return acc;
    }, {}),
    ...(obj.subItems
      ? {
        subItems: {
          ...obj.subItems,
          items: obj.subItems.items.map((subItem) => renameKeys(subItem, device)
          ),
        },
      }
      : {}),
    _device: device,
  };
}
