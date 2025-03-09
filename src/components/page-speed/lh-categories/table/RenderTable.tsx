import { Fragment } from 'react';
import { NodeComponent } from './RenderNode';
import { ItemValue, ItemValueType, TableColumnHeading, TableItem } from '@/lib/schema';

interface EntityInfo {
  name: string;
  category?: string;
  isFirstParty?: boolean;
  homepage?: string;
}

interface TableProps {
  headings: TableColumnHeading[];
  items: TableItem[];
  isEntityGrouped?: boolean;
  skipSumming?: string[];
  sortedBy?: string[];
  entities?: EntityInfo[];
  device: 'Desktop' | 'Mobile';
}

const SUMMABLE_VALUETYPES: ItemValueType[] = [
  'bytes',
  'numeric',
  'ms',
  'timespanMs',
];

function getDerivedSubItemsHeading(heading: TableColumnHeading ) {
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
      <div
        className="grid grid-cols-subgrid border-b-2"
        style={{
          gridColumn: `span ${headings.length} / span ${headings.length}`,
        }}
      >
        {headings.map((heading, index) => (
          <div
            key={index}
            className="grid-col-span-1 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
          >
            {typeof heading.label === 'string'
              ? heading.label
              : heading.label?.formattedDefault}
          </div>
        ))}
      </div>

      {entityItems.length > 0
        ? // Render entity-grouped rows
          entityItems.map((entityItem, index) => (
            <Fragment key={index}>
              <div
                className="grid grid-cols-subgrid border-b-2 transition-colors hover:bg-muted/50"
                style={{
                  gridColumn: `span ${headings.length} / span ${headings.length}`,
                }}
              >
                {headings.map((heading, colIndex) => (
                  <div
                    key={colIndex}
                    className="whitespace-nowrap px-6 py-4 text-sm"
                    style={{
                      gridColumn: `${colIndex + 1} / ${colIndex + 2}`,
                    }}
                  >
                    {heading.key ? (
                      <RenderTableValue
                        value={entityItem[heading.key]}
                        heading={heading}
                        device={device}
                      />
                    ) : null}

                  </div>
                ))}
              </div>
              {items
                .filter((item) => item.entity === entityItem.entity)
                .map((item, subIndex) => (
                  <Fragment key={`${index}-${subIndex}`}>
                    <div
                      className="grid grid-cols-subgrid border-b-2 transition-colors hover:bg-muted/50"
                      style={{
                        gridColumn: `span ${headings.length} / span ${headings.length}`,
                      }}
                    >
                      {headings.map((heading, colIndex) => (
                        <div
                          key={colIndex}
                          className="whitespace-nowrap px-6 py-4 text-xs"
                        >
                          {heading.key ? (
                            <RenderTableValue
                              value={item[heading.key]}
                              heading={heading}
                              device={device}
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>
                    {item.subItems?.items.map((subItem, subIndex) => (
                      <div
                        key={subIndex}
                        className="grid grid-cols-subgrid border-b-2 px-4 transition-colors hover:bg-muted/50"
                        style={{
                          gridColumn: `span ${headings.length} / span ${headings.length}`,
                        }}
                      >
                        {headings.map((heading, colIndex) => (
                          <div key={colIndex} className="px-6 py-4 text-xs">
                            {heading.subItemsHeading?.key ? (
                              <RenderTableValue
                                value={subItem[heading.subItemsHeading.key]}
                                heading={getDerivedSubItemsHeading(heading)}
                                device={device}
                              />
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ))}
                  </Fragment>
                ))}
            </Fragment>
          ))
        : items.map((item, index) => (
            <Fragment key={index}>
              <div
                className="0 grid grid-cols-subgrid border-b-2 transition-colors hover:bg-muted/50"
                style={{
                  gridColumn: `span ${headings.length} / span ${headings.length}`,
                }}
              >
                {headings.map((heading, colIndex) => (
                  <div key={colIndex} className="px-6 py-4 text-xs">
                    {heading.key ? (
                      <RenderTableValue
                        value={item[heading.key]}
                        heading={heading}
                        device={device}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
              {item.subItems?.items ? (
                <div
                  className="1 grid grid-cols-subgrid whitespace-nowrap border-2 px-4 text-left font-medium uppercase tracking-wider text-gray-500 transition-colors hover:bg-muted/50"
                  style={{
                    gridColumn: `span ${headings.length} / span ${headings.length}`,
                  }}
                >
                  {headings.map((heading, colIndex) => {
                    const headingKey = heading.subItemsHeading?.key;
                    if (!headingKey) {
                      return null;
                      return <div key={colIndex}> </div>;
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
                      <div
                        key={colIndex}
                        className="px-6 py-4 text-sm"
                        style={{
                          gridColumn: `${colIndex + 1} / ${colIndex + 2}`,
                        }}
                      >
                        {typeof headingInfo.label === 'string'
                          ? headingInfo.label
                          : headingInfo.label?.formattedDefault}
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {item.subItems?.items.map((subItem, subIndex) => (
                <div
                  key={subIndex}
                  className="2 grid grid-cols-subgrid border-2 px-4 transition-colors hover:bg-muted/50"
                  style={{
                    gridColumn: `span ${headings.length} / span ${headings.length}`,
                  }}
                >
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
                </div>
              ))}
            </Fragment>
          ))}
    </div>
  );
}

const URL_PREFIXES = ['http://', 'https://', 'data:'];

/**
 * Render a details item value for embedding in a table. Renders the value
 * based on the heading's valueType, unless the value itself has a `type`
 * property to override it.
 * @param {TableItemValue} value
 * @param {LH.Audit.Details.TableColumnHeading} heading
 * @return {Element|null}
 */
function RenderTableValue({
  value,
  heading,
  device,
}: {
  value?: ItemValue;
  heading?: TableColumnHeading | null;
  device: 'Desktop' | 'Mobile';
}) {
  if (value === undefined || value === null) {
    return null;
  }

  // First deal with the possible object forms of value.
  if (typeof value === 'object' && 'type' in value) {
    // The value's type overrides the heading's for this column.
    switch (value.type) {
      case 'code': {
        return (
          <pre title="code" className="text-xs">
            {typeof value.value === 'string' ? value.value : JSON.stringify(value.value)}
          </pre>
        );
      }
      case 'link': {
        return (
          <a
            href={value.url}
            title="link"
            className="block w-[50ch] overflow-hidden text-ellipsis whitespace-nowrap"
          >
            {value.text}
          </a>
        );
      }
      case 'node': {
        return <NodeComponent item={value} device={device} />;
      }
      case 'numeric': {
        if (heading?.granularity) {
          return (
            <div title="numeric">
              {value.value.toFixed(-Math.log10(heading.granularity))}
            </div>
          );
        }

        return <div title="numeric">{value.value}</div>;
      }
      case 'source-location': {
        return (
          <div title="source-location" className="font-mono text-xs">
            {JSON.stringify(value, null, 2)}
          </div>
        );
      }
      case 'url': {
        return (
          <a
            href={value.value}
            title="url"
            className="block w-[50ch] overflow-hidden text-ellipsis whitespace-nowrap"
          >
            {value.value}
          </a>
        );
      }
      case 'text': {
        return <div title="text">{value.value}</div>;
      }
      default: {
        return <pre title="default">{JSON.stringify(value, null, 2)}</pre>;
      }
    }
  }

  // Next, deal with primitives.
  switch (heading?.valueType) {
    case 'bytes': {
      const bytes = Number(value);
      const kb = bytes / 1024;
      const mb = kb / 1024;
      return (
        <div title="bytes" className="align-right">
          {mb > 1
            ? `${mb.toFixed(2)} MB`
            : kb > 1
              ? `${kb.toFixed(2)} KB`
              : `${bytes} bytes`}
        </div>
      );
    }
    case 'code': {
      const strValue = String(value);
      return (
        <code title="code" className="font-mono text-xs">
          {strValue}
        </code>
      );
    }
    case 'ms': {
      return (
        <div title="ms" className="align-right">
          {(value  as number).toFixed(2)} ms
        </div>
      );
    }
    case 'numeric': {
      if (heading?.granularity && value) {
        return (
          <div title="numeric" className="align-right">
            {(value as number).toFixed(-Math.log10(heading.granularity || 1))}
          </div>
        );
      }

      return (
        <div title="numeric" className="align-right">
          {(value as number).toFixed(-Math.log10(heading.granularity || 1))}
        </div>
      );
    }
    case 'text': {
      const strValue = String(value);
      return <div title="text">{strValue}</div>;
    }
    case 'thumbnail': {
      const strValue = String(value);
      return <div title="thumbnail">{strValue}</div>;
    }
    case 'timespanMs': {
      const numValue = Number(value);
      return (
        <div title="timespanMs" className="align-right">
          {numValue}
        </div>
      );
    }
    case 'url': {
      const strValue = String(value);
      if (URL_PREFIXES.some((prefix) => strValue.startsWith(prefix))) {
        return (
          <a
            href={strValue}
            className="block w-[50ch] overflow-hidden text-ellipsis whitespace-nowrap"
          >
            {strValue}
          </a>
        );
      } else {
        // Fall back to <pre> rendering if not actually a URL.
        return <div title="url">{strValue}</div>;
      }
    }
    default: {
      console.log('default', value);
      return <pre title="default">{JSON.stringify(value, null, 2)}</pre>;
    }
  }
}
