import { TableItem, TableColumnHeading } from '@/lib/schema';
import { Fragment } from 'react';
import { getDerivedSubItemsHeading } from './utils';
import { RenderTableRowContainer } from './RenderTableRowContainer';
import { RenderTableHeader } from './RenderTableHeader';
import { RenderHeading } from './RenderHeading';
import { RenderTableCell } from './RenderTableCell';
import { RenderTableValue } from './RenderTableValue';

export function RenderBasicTable({
  headings,
  items,
  device,
}: {
  headings: TableColumnHeading[];
  items: TableItem[];
  device:'Desktop' | 'Mobile';
}) {
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
              {headings
                .map((heading) => {
                  const headingKey = heading.subItemsHeading?.key;
                  if (!headingKey) {
                    return null;
                  }
                  const headingInfo = headings.find(
                    ({ key }) => key === headingKey,
                  );
                  return headingInfo;
                })
                .filter((heading): heading is TableColumnHeading => !!heading)
                .map((heading, colIndex) => {
                  return (
                    <RenderHeading
                      key={colIndex}
                      heading={heading}
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
