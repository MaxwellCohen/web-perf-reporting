import { TableItem, TableColumnHeading, DeviceType } from '@/lib/schema';

import { getDerivedSubItemsHeading } from './utils';
import { RenderTableRowContainer } from './RenderTableRowContainer';
import { RenderTableHeader } from './RenderTableHeader';
import { RenderHeading } from './RenderHeading';
import { RenderTableCell } from './RenderTableCell';
import { RenderTableValue } from './RenderTableValue';
import { Fragment } from 'react';

export function RenderBasicTable({
  headings,
  items,
  device,
}: {
  headings: TableColumnHeading[];
  items: TableItem[];
  device: DeviceType;
}) {
  return (
    <div
      className="grid overflow-x-auto"
      style={{ gridTemplateColumns: `repeat(${headings?.length || 0}, auto)` }}
    >
      <RenderTableHeader headings={headings} />
      {items.map((item, index) => (
        <Fragment key={`item-${index}`}>
          <RenderMainRow item={item} headings={headings} device={device} />
          {item.subItems?.items?.length ? (
            <>
              <RenderSubItemsHeader headings={headings} />
              <RenderSubItems item={item} headings={headings} device={device} />
            </>
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getItemDevice = (item: any, device: DeviceType): DeviceType =>
  (item?._device as DeviceType) || device;

function RenderSubItems({
  item,
  headings,
  device,
}: {
  item: TableItem;
  headings: TableColumnHeading[];
  device: DeviceType;
}) {
  if (!item.subItems?.items?.length) return null;

  return item.subItems.items.map((subItem, subIndex) => (
    <RenderTableRowContainer
      headings={headings}
      key={`subitem-${subIndex}`}
      className="border-2"
    >
      {headings.map((heading, colIndex) => (
        <div
          key={`subcell-${heading.key || colIndex}`}
          className="px-6 py-2 text-sm"
        >
          {heading.subItemsHeading?.key ? (
            <RenderTableValue
              value={subItem[heading.subItemsHeading.key]}
              heading={getDerivedSubItemsHeading(heading)}
              device={getItemDevice(item, device)}
            />
          ) : (
            ' '
          )}
        </div>
      ))}
    </RenderTableRowContainer>
  ));
}

export function RenderSubItemsHeader({
  headings,
}: {
  headings: TableColumnHeading[];
}) {
  return (
    <RenderTableRowContainer headings={headings}>
      {headings.map((h, colIndex) => {
        const headingKey = h?.subItemsHeading?.key;
        if (!headingKey) return null;
        const heading = headings.find(({ key }) => key === headingKey);
        if (!heading) {
          return null;
        }

        return (
          <RenderHeading
            key={`subheading-${heading.key || colIndex}`}
            heading={heading}
            className="px-6 py-2 text-sm tracking-wider text-gray-500"
            style={{
              gridColumn: `${colIndex + 1} / ${colIndex + 2}`,
            }}
          />
        );
      })}
    </RenderTableRowContainer>
  );
}

function RenderMainRow({
  item,
  headings,
  device,
}: {
  item: TableItem;
  headings: TableColumnHeading[];
  device: DeviceType;
}) {
  return (
    <RenderTableRowContainer headings={headings}>
      {headings
        .map((heading, colIndex) => {
          if (!heading.key) return null;
          return (
            <RenderTableCell
              key={`cell-${heading.key}-${colIndex}`}
              className="px-6 py-4 text-xs"
              value={item[heading.key]}
              heading={heading}
              device={getItemDevice(item, device)}
            />
          );
        })
        .filter(Boolean)}
    </RenderTableRowContainer>
  );
}
