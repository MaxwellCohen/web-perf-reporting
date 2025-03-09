import { Fragment } from 'react';
import {
  Entities,
  ItemValue,
  ItemValueType,
  TableColumnHeading,
  TableItem,
} from '@/lib/schema';
import { RenderTableValue } from './RenderTableValue';
import { cn } from '@/lib/utils';

interface TableProps {
  headings: TableColumnHeading[];
  items: TableItem[];
  isEntityGrouped?: boolean;
  skipSumming?: string[];
  sortedBy?: string[];
  entities?: Entities[];
  device: 'Desktop' | 'Mobile';
}

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
  headings,
  isEntityGrouped,
  skipSumming,
  sortedBy,
}: {
  items: TableItem[];
  headings: TableColumnHeading[];
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
  headings,
  items,
  isEntityGrouped = false,
  skipSumming = [],
  sortedBy,
  device,
}: TableProps) {
  console.log('headings', headings);
  if (!items?.length) return null;
  if (!headings?.length) return null;

  const entityItems = getEntityGroupItems({
    items,
    headings,
    isEntityGrouped,
    skipSumming,
    sortedBy,
  });

  return (
    <div
      className="grid overflow-x-auto"
      style={{ gridTemplateColumns: `repeat(${headings.length}, auto)` }}
    >
      <RenderTableHeader headings={headings} />
      {entityItems.length > 0 ? (
        <RenderEntityGroupRows
          entityItems={entityItems}
          headings={headings}
          device={device}
          items={items}
        />
      ) : (
        <RenderTableItems items={items} headings={headings} device={device} />
      )}
    </div>
  );
}

function RenderTableHeader({ headings }: { headings: TableColumnHeading[] }) {
  return (
    <RenderTableRowContainer headings={headings}>
      {headings.map((heading, index) => (
        <RenderHeading
          key={index}
          heading={heading}
          className="grid-col-span-1 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
        />
      ))}
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
      className={cn('grid grid-cols-subgrid border-b-2', props.className)}
      style={{
        gridColumn: `span ${headings.length} / span ${headings.length}`,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

function RenderHeading({
  heading,
  ...props
}: { heading: TableColumnHeading } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props}>
      {typeof heading.label === 'string'
        ? heading.label
        : heading.label?.formattedDefault}
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
  headings,
  device,
  items,
}: {
  entityItems: TableItem[];
  headings: TableColumnHeading[];
  device: 'Desktop' | 'Mobile';
  items: TableItem[];
}) {
  return entityItems?.map((entityItem, index) => (
    <Fragment key={index}>
      <RenderTableRowContainer headings={headings}>
        {headings.map((heading, colIndex) => {
          if (!heading.key) return null;
          return (
            <RenderTableCell
              key={colIndex}
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
                    key={colIndex}
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
              <RenderTableRowContainer headings={headings} key={subIndex}>
                {headings.map((heading, colIndex) => {
                  if (!heading.subItemsHeading?.key) return null;
                  return (
                    <RenderTableCell
                      key={colIndex}
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
    </Fragment>
  ));
}

function RenderTableItems({
  items,
  headings,
  device,
}: {
  items: TableItem[];
  headings: TableColumnHeading[];
  device: 'Desktop' | 'Mobile';
}) {
  return items.map((item, index) => (
    <Fragment key={index}>
      <RenderTableRowContainer headings={headings}>
        {headings.map((heading, colIndex) => {
          if (!heading.key) return null;
          return (
            <RenderTableCell
              key={colIndex}
              className="px-6 py-4 text-xs"
              value={item[heading.key]}
              heading={heading}
              device={device}
            />
          );
        })}
      </RenderTableRowContainer>
      {item.subItems?.items ? (
        <RenderTableRowContainer headings={headings}>
          {headings.map((heading, colIndex) => {
            const headingKey = heading.subItemsHeading?.key;
            if (!headingKey) {
              return null;
            }
            const headingInfo = headings.find(({ key }) => key === headingKey);
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
        <RenderTableRowContainer headings={headings} key={subIndex}>
          {headings.map((heading, colIndex) => (
            <div key={colIndex} className="px-6 py-4 text-sm">
              {heading.subItemsHeading?.key ? (
                <RenderTableValue
                  value={subItem[heading.subItemsHeading.key]}
                  heading={getDerivedSubItemsHeading(heading)}
                  device={device}
                />
              ) : (
                ' '
              )}
            </div>
          ))}
        </RenderTableRowContainer>
      ))}
    </Fragment>
  ));
}
