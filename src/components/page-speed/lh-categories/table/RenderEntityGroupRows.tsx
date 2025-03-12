import { TableItem, TableColumnHeading } from '@/lib/schema';
import { Fragment } from 'react';
import { getDerivedSubItemsHeading } from './utils';
import { RenderTableHeader, RenderTableRowContainer } from './RenderTable';
import { RenderTableCell } from './RenderTableCell';

export function RenderEntityGroupRows({
  entityItems, headings = [], device, items,
}: {
  entityItems: TableItem[];
  headings?: TableColumnHeading[];
  device: 'Desktop' | 'Mobile';
  items: TableItem[];
}) {
  console.log({
    entityItems,
    headings,
    device,
    items,
  });

  return (
    <div
      className="grid overflow-x-auto"
      style={{ gridTemplateColumns: `repeat(${headings?.length || 0}, auto)` }}
    >
      <RenderTableHeader headings={headings} />
      {entityItems?.map((entityItem, index) => (
        <Fragment key={index}>
          <RenderTableRowContainer headings={headings}>
            {headings.map((heading, colIndex) => {
              // if (!heading.key) return null;
              return (
                <RenderTableCell
                  key={`${index}-${colIndex}`}
                  className="whitespace-nowrap px-6 py-4 text-sm"
                  style={{
                    gridColumn: `${colIndex + 1} / ${colIndex + 2}`,
                  }}
                  value={entityItem[heading.key || '']}
                  heading={heading}
                  device={device} />
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
                        value={item[heading.key || '']}
                        heading={heading}
                        device={device} />
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
                          device={device} />
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
