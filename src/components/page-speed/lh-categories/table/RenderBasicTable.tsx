import { TableItem, TableColumnHeading, DeviceType } from '@/lib/schema';

import { getDerivedSubItemsHeading } from './utils';
import {
  RenderTableRowContainer,
  renderTableRowContainerCss,
} from './RenderTableRowContainer';
import { RenderTableHeader } from './RenderTableHeader';
import { RenderHeading } from './RenderHeading';
import { RenderTableCell } from './RenderTableCell';
import { RenderTableValue } from './RenderTableValue';
import { Fragment, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
      <RenderTableHeader headings={headings} className={'border-0'} />
      {items.map((item, index) => {
        if (!item.subItems?.items?.length) {
          return (
            <RenderMainRow
            className={'border-0'}
              key={`item-${index}`}
              item={item}
              headings={headings}
              device={device}
            />
          );
        }
        return (
          <NestedTableNoCollapse
            key={`item-${index}`}
            item={item}
            headings={headings}
            device={device}
          />
        );
      })}
    </div>
  );
}

export function NestedTableNoCollapse({
  item,
  headings,
  device,
}: {
  item: TableItem;
  headings: TableColumnHeading[];
  device: DeviceType;
}) {
  return (
    <Fragment>
      <RenderMainRow item={item} headings={headings} device={device} className={'border-x-2 border-t-2 border-b-3'} />
      {item.subItems?.items?.length ? (
        <div className="contents">
          <RenderSubItemsHeader headings={headings} />
          <RenderSubItems item={item} headings={headings} device={device} />
        </div>
      ) : null}
      <div className="mb-2 w-full"></div>
    </Fragment>
  );
}

export function NestedTable({
  item,
  headings,
  device,
}: {
  item: TableItem;
  headings: TableColumnHeading[];
  device: DeviceType;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const rowClasses = cn({
    'grid-template-rows-none h-0 overflow-hidden border-none': !isOpen,
  });
  return (
    <Fragment>
      <Button
        variant="outline"
        size="lg"
        className={cn(renderTableRowContainerCss, 'h-14 p-0 text-left')}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
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
      </Button>
      {item.subItems?.items?.length ? (
        <div
          className={cn(renderTableRowContainerCss, {
            'animate-accordion-up': !isOpen,
            'animate-accordion-down': isOpen,
          })}
        >
          <RenderSubItemsHeader headings={headings} className={rowClasses} />
          <RenderSubItems
            item={item}
            headings={headings}
            device={device}
            className={rowClasses}
          />
        </div>
      ) : null}
      <div className="mb-2 w-full"></div>
    </Fragment>
  );
}

const getItemDevice = (
  item: { _device?: DeviceType },
  device: DeviceType,
): DeviceType => (item?._device as DeviceType) || device;

function RenderSubItems({
  item,
  headings,
  device,
  ...props
}: {
  item: TableItem;
  headings: TableColumnHeading[];
  device: DeviceType;
} & React.HTMLAttributes<HTMLDivElement>) {
  if (!item.subItems?.items?.length) return null;

  return item.subItems.items.map((subItem, subIndex) => (
    <RenderTableRowContainer
      key={`subitem-${subIndex}`}
      {...props}
      className={cn('border-x-2 border-b-2', props.className)}
    >
      {headings.map((heading, colIndex) => (
        <RenderTableValue
          key={`subcell-${heading.key || colIndex}`}
          className="px-6 py-0.5 text-sm"
          value={subItem[heading?.subItemsHeading?.key || '']}
          heading={getDerivedSubItemsHeading(heading)}
          device={getItemDevice(item, device)}
        />
      ))}
    </RenderTableRowContainer>
  ));
}

export function RenderSubItemsHeader({
  headings,
  ...props
}: {
  headings: TableColumnHeading[];
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <RenderTableRowContainer
      {...props}
      className={cn(renderTableRowContainerCss, 'border-2', props.className)}
    >
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
            className="px-6 py-0.5 text-sm tracking-wider text-muted-foreground"
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
  ...props
}: {
  item: TableItem;
  headings: TableColumnHeading[];
  device: DeviceType;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <RenderTableRowContainer {...props}>
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
