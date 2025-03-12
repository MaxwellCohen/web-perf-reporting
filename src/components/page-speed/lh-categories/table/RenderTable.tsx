import { Fragment } from 'react';
import {
  AuditDetailOpportunity,
  AuditDetailTable,
  ItemValue,
  ItemValueType,
  TableColumnHeading,
  TableItem,
} from '@/lib/schema';
import { RenderTableValue } from './RenderTableValue';
import { cn } from '@/lib/utils';

const SUMMABLE_VALUETYPES: ItemValueType[] = [
  'bytes',
  'numeric',
  'ms',
  'timespanMs',
];

function getDerivedSubItemsHeading(
  heading: TableColumnHeading,
): TableColumnHeading | null {
  if (!heading.subItemsHeading) return null;
  return {
    key: heading.subItemsHeading.key || '',
    valueType: heading.subItemsHeading.valueType || heading.valueType,
    granularity: heading.subItemsHeading.granularity || heading.granularity,
    displayUnit: heading.subItemsHeading.displayUnit || heading.displayUnit,
    label: '',
  };
}

export function getTableItemSortComparator(sortedBy: string[]) {
  return (a: TableItem, b: TableItem) => {
    for (const key of sortedBy) {
      const aVal = a[key];
      const bVal = b[key];
      if (
        typeof aVal !== typeof bVal ||
        !['number', 'string'].includes(typeof aVal)
      ) {
        console.warn(
          `Warning: Attempting to sort unsupported value type: ${key}.`,
        );
      }
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

const getEntityGroupItems = ({
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
  if (!items.length || isEntityGrouped || !items.some((item) => item.entity)) {
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

export function DetailTable({
  mobileDetails,
  desktopDetails,
}: {
  mobileDetails?: AuditDetailOpportunity | AuditDetailTable;
  desktopDetails?: AuditDetailOpportunity | AuditDetailTable;
}) {
  console.log('desktopDetails', desktopDetails?.items);

  const items = desktopDetails?.items || [];
  const headings = desktopDetails?.headings;
  const isEntityGrouped = !!desktopDetails?.isEntityGrouped;
  const skipSumming =
    desktopDetails?.skipSumming || mobileDetails?.skipSumming || [];
  const sortedBy = desktopDetails?.sortedBy || mobileDetails?.sortedBy;

  const device = 'Desktop';
  if (!items?.length) return null;
  // if (!headings?.length && mobileDetails?.headings?.length) return null;

  const entityItems = getEntityGroupItems({
    items,
    headings,
    isEntityGrouped,
    skipSumming,
    sortedBy,
  });

  return (
    <>
      {entityItems.length > 0 ? (
        <RenderEntityGroupRows
          entityItems={entityItems}
          headings={headings}
          device={device}
          items={items}
        />
      ) : (
        <RenderTableItems
          desktopHeadings={desktopDetails?.headings}
          desktopItems={desktopDetails?.items}
          mobileHeadings={desktopDetails?.headings}
          mobileItems={mobileDetails?.items}
        />
      )}
    </>
  );
}

function updateTableHeading(
  heading: TableColumnHeading,
  device: 'Desktop' | 'Mobile',
): TableColumnHeading {
  if (!showBothDevices(heading)) {
    return heading;
  }

  return {
    key: `${heading.key}-${device}`,
    label: `${heading.label} (${device})`,
    valueType: heading.valueType,
    granularity: heading.granularity,
    displayUnit: heading.displayUnit,
    ...(heading.subItemsHeading
      ? {
          subItemsHeading: heading.subItemsHeading,
        }
      : {}),
  };
}

function mergeHeadings(
  mobileHeadings?: TableColumnHeading[],
  desktopHeadings?: TableColumnHeading[],
) {
  const headings: TableColumnHeading[] = [];
  const mHeadings = (mobileHeadings || []).map((heading) =>
    updateTableHeading(heading, 'Mobile'),
  )
  const dHeadings = (desktopHeadings || []).map((heading) =>
    updateTableHeading(heading, 'Desktop'),
  )
  while (mHeadings.length && dHeadings.length) {
    let i = mHeadings.shift()
    if (i) {
      headings.push(i)
    }
    i = dHeadings.shift()
    if (i) {
      headings.push(i)
    }
  }
  return headings.filter(
    (heading, i, Arr) => Arr.findIndex((t) => t.key === heading.key) === i,
  );
}

function showBothDevices(heading: TableColumnHeading) {
  return SUMMABLE_VALUETYPES.includes(heading.valueType as ItemValueType);
}

function RenderTableHeader({ headings }: { headings: TableColumnHeading[] }) {
  return (
    <RenderTableRowContainer headings={headings}>
      {headings.map((heading, index) => {
        if (heading.key === null) return null;
        return (
          <RenderHeading
            key={index}
            heading={heading}
            className="grid-col-span-1 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
          />
        );
      })}
    </RenderTableRowContainer>
  );
}

function RenderTableRowContainer({
  children,
  headings,
  ...props
}: {
  children: React.ReactNode;
  headings: TableColumnHeading[];
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn('grid grid-cols-subgrid border-b-2', props.className)}
      style={{
        gridColumn: `span ${headings.length} / span ${headings.length }`,
      }}
    >
      {children}
    </div>
  );
}

function RenderHeading({
  heading,
  device,
  ...props
}: {
  heading: TableColumnHeading;
  device?: 'Desktop' | 'Mobile';
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props}>
      {typeof heading.label === 'string'
        ? heading.label
        : heading.label?.formattedDefault}
      {device ? `(${device})` : null}
    </div>
  );
}

function RenderTableCell({
  value,
  heading,
  device,
  ...props
}: {
  value?: ItemValue;
  heading: TableColumnHeading | null;
  device: 'Desktop' | 'Mobile';
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props}>
      {heading?.key ? (
        <RenderTableValue value={value} heading={heading} device={device} />
      ) : null}
    </div>
  );
}

function RenderEntityGroupRows({
  entityItems,
  headings = [],
  device,
  items,
}: {
  entityItems: TableItem[];
  headings?: TableColumnHeading[];
  device: 'Desktop' | 'Mobile';
  items: TableItem[];
}) {
  return (
    <div
      className="grid overflow-x-auto"
      style={{ gridTemplateColumns: `repeat(${headings?.length || 0}, auto)` }}
    >
      <RenderTableHeader headings={headings} />
      {entityItems?.map((entityItem, index) => (
        <div key={index}>
          <RenderTableRowContainer headings={headings}>
            {headings.map((heading, colIndex) => {
              if (!heading.key) return null;
              return (
                <RenderTableCell
                  key={`${index}-${colIndex}`}
                  className="whitespace-nowrap px-6 py-4 text-sm"
                  style={{
                    gridColumn: `${colIndex + 1} / ${colIndex + 2}`,
                  }}
                  value={entityItem[heading.key]}
                  heading={heading}
                  device={device}
                />
              );
            })}
          </RenderTableRowContainer>
          {items
            .filter((item) => item.entity === entityItem.entity)
            .map((item, subIndex) => (
              <Fragment key={`${index}-${subIndex}`}>
                <RenderTableRowContainer headings={headings}>
                  {headings.map((heading, colIndex) => {
                    if (!heading.key) return null;
                    return (
                      <RenderTableCell
                        key={`${index}-${colIndex}`}
                        className="whitespace-nowrap px-6 py-4 text-sm"
                        style={{
                          gridColumn: `${colIndex + 1} / ${colIndex + 2}`,
                        }}
                        value={entityItem[heading.key]}
                        heading={heading}
                        device={device}
                      />
                    );
                  })}
                </RenderTableRowContainer>
                {item.subItems?.items.map((subItem, subIndex) => (
                  <RenderTableRowContainer
                    headings={headings}
                    key={subIndex}
                    className="border-red-500"
                  >
                    {headings.map((heading, colIndex) => {
                      if (!heading.subItemsHeading?.key) return null;
                      return (
                        <RenderTableCell
                          key={`${index}-${colIndex}`}
                          className="whitespace-nowrap px-6 py-4 text-sm"
                          style={{
                            gridColumn: `${colIndex + 1} / ${colIndex + 2}`,
                          }}
                          value={subItem[heading.subItemsHeading.key]}
                          heading={getDerivedSubItemsHeading(heading)}
                          device={device}
                        />
                      );
                    })}
                  </RenderTableRowContainer>
                ))}
              </Fragment>
            ))}
        </div>
      ))}
    </div>
  );
}

const makeID = (i: TableItem) =>
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

function mergeTableItem(a: TableItem, b: TableItem): TableItem {
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

function reduceTableItems(acc: TableItem[], item: TableItem) {
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

function renameKeys(obj: TableItem, device: 'Desktop' | 'Mobile'): TableItem {
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
            items: obj.subItems.items.map((subItem) =>
              renameKeys(subItem, device),
            ),
          },
        }
      : {}),
    _device: device,
  };
}

function RenderTableItems({
  desktopItems,
  mobileItems,
  mobileHeadings,
  desktopHeadings,
}: {
  desktopItems?: TableItem[];
  mobileItems?: TableItem[];
  mobileHeadings?: TableColumnHeading[];
  desktopHeadings?: TableColumnHeading[];
}) {
  let headings: TableColumnHeading[] = [];
  let items: TableItem[] = [];
  let device: 'Desktop' | 'Mobile' = 'Desktop';
  if (!desktopItems && !mobileItems) {
    return null;
  }
  const mItems = (mobileItems || []).map((i) => renameKeys(i, 'Mobile'));
  const dItems = (desktopItems || []).map((i) => renameKeys(i, 'Desktop'));
  if (!desktopItems?.length && mItems?.length) {
    headings = mergeHeadings(mobileHeadings || []);
    headings = mobileHeadings || [];
    items = mItems;
    device = 'Mobile';
  }
  if (!mobileItems?.length && dItems?.length) {
    headings = mergeHeadings([], desktopHeadings || []);
    items = dItems;
    device = 'Desktop';
  }
  if (dItems?.length && mItems?.length) {
    headings = mergeHeadings(mobileHeadings, desktopHeadings);
    items = [...mItems, ...dItems].reduce(reduceTableItems, []);
  }
  console.log({ headings, items });
  return (
    <div
      className="grid overflow-x-auto"
      style={{ gridTemplateColumns: `repeat(${headings?.length || 0}, auto)` }}
    >
      <RenderTableHeader headings={headings} />
      {items.map((item, index) => (
        <Fragment key={index}>
          <RenderTableRowContainer headings={headings}>
            {headings
              .map((heading, colIndex) => {
                if (!heading.key) return null;
                return (
                  <RenderTableCell
                    key={`${index}-${colIndex}-ADF`}
                    className="px-6 py-4 text-xs"
                    value={item[heading.key]}
                    heading={heading}
                    device={(item._device as 'Desktop' | 'Mobile') || device}
                  />
                );
              })
              .filter(Boolean)}
          </RenderTableRowContainer>
          {item.subItems?.items ? (
            <RenderTableRowContainer headings={headings}>
              {headings.map((heading, colIndex) => {
                const headingKey = heading.subItemsHeading?.key;
                if (!headingKey) {
                  return null;
                }
                const headingInfo = headings.find(
                  ({ key }) => key === headingKey,
                );
                if (!headingInfo) {
                  return null;
                  // return <div key={colIndex}> </div>;
                }
                if (headingInfo.key === heading.subItemsHeading?.key) {
                  return null;
                }

                return (
                  <RenderHeading
                    key={colIndex}
                    heading={headingInfo}
                    className="px-6 py-4 text-sm"
                    style={{
                      gridColumn: `${colIndex + 1} / ${colIndex + 2}`,
                    }}
                  />
                );
              })}
            </RenderTableRowContainer>
          ) : null}
          {item.subItems?.items.map((subItem, subIndex) => (
            <RenderTableRowContainer
              headings={headings}
              key={subIndex}
              className="border-2"
            >
              {headings.map((heading, colIndex) => (
                <div key={colIndex} className="px-6 py-4 text-sm">
                  {heading.subItemsHeading?.key ? (
                    <RenderTableValue
                      value={subItem[heading.subItemsHeading.key]}
                      heading={getDerivedSubItemsHeading(heading)}
                      device={(item._device as 'Desktop' | 'Mobile') || device}
                    />
                  ) : (
                    ' '
                  )}
                </div>
              ))}
            </RenderTableRowContainer>
          ))}
        </Fragment>
      ))}
    </div>
  );
}
