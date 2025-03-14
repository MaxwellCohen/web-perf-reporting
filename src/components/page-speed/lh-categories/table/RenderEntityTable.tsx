import { TableItem, TableColumnHeading, DeviceType } from '@/lib/schema';
import { Fragment, useMemo } from 'react';
import { getDerivedSubItemsHeading } from './utils';
import { RenderTableRowContainer } from './RenderTableRowContainer';
import { RenderTableHeader } from './RenderTableHeader';
import { RenderTableCell } from './RenderTableCell';
import { getEntityGroupItems } from './getEntityGroupItems';


export function RenderEntityTable({
  headings = [],
  device,
  items,
  isEntityGrouped,
  skipSumming,
  sortedBy,
}: {
  headings?: TableColumnHeading[];
  device: DeviceType;
  items: TableItem[];
  isEntityGrouped: boolean;
  skipSumming: string[];
  sortedBy: string[];
}) {
  const entityItems = useMemo(() => getEntityGroupItems({
    items,
    headings,
    isEntityGrouped,
    skipSumming,
    sortedBy,
  }), [items, headings, isEntityGrouped, skipSumming, sortedBy]);

  return (
    <div
      className="grid overflow-x-auto"
      style={{ gridTemplateColumns: `repeat(${headings?.length || 0}, auto)` }}
    >
      <RenderTableHeader headings={headings}  />
      {entityItems?.map((entityItem, index) => (
        <Fragment key={index}>
          <RenderTableRowContainer headings={headings}>
            {headings.map((heading, colIndex) => {
              // if (!heading.key) return null;
              return (
                <RenderTableCell
                  key={`${index}-${colIndex}`}
                  className="whitespace-nowrap px-6 py-2 text-sm"
                  style={{
                    gridColumn: `${colIndex + 1} / ${colIndex + 2}`,
                  }}
                  value={entityItem[heading.key || '']}
                  heading={heading}
                  device={(entityItem?._device as DeviceType) || device}
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
                        className="whitespace-nowrap px-6 py-2 text-sm"
                        style={{
                          gridColumn: `${colIndex + 1} / ${colIndex + 2}`,
                        }}
                        value={item[heading.key]}
                        heading={heading}
                        device={(item?._device as DeviceType) || device}
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
                          className="whitespace-nowrap px-6 py-2 text-sm"
                          style={{
                            gridColumn: `${colIndex + 1} / ${colIndex + 2}`,
                          }}
                          value={subItem[heading.subItemsHeading.key]}
                          heading={getDerivedSubItemsHeading(heading)}
                          device={(subItem._device as DeviceType) || device}
                        />
                      );
                    })}
                  </RenderTableRowContainer>
                ))}
              </Fragment>
            ))}
        </Fragment>
      ))}
    </div>
  );
}
