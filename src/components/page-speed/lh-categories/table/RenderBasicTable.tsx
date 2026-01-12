import { TableItem, TableColumnHeading, DeviceType } from '@/lib/schema';

import { getDerivedSubItemsHeading, showBothDevices } from '@/components/page-speed/lh-categories/table/utils';
import {
  RenderTableRowContainer,
  renderTableRowContainerCss,
} from '@/components/page-speed/lh-categories/table/RenderTableRowContainer';
import { RenderTableHeader } from '@/components/page-speed/lh-categories/table/RenderTableHeader';
import { RenderHeading } from '@/components/page-speed/lh-categories/table/RenderHeading';
import { RenderTableCell } from '@/components/page-speed/lh-categories/table/RenderTableCell';
import { RenderTableValue } from '@/components/page-speed/lh-categories/table/RenderTableValue';
import { Fragment, JSX } from 'react';
import { cn } from '@/lib/utils';
import { Details } from '@/components/ui/accordion';
import { toSentenceCase } from '@/components/common/FormFactorPercentPieChart';

export function RenderBasicTable({
  headings,
  items,
  device,
  title,
}: {
  headings: TableColumnHeading[];
  items: TableItem[];
  device: DeviceType;
  title: string;
}) {
  return (
    <Details className="@container">
      <summary className="flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          <div className="text-lg font-bold">
            {toSentenceCase(`${title} details`.trim())}
          </div>
        </div>
      </summary>
      <TableContainer headings={headings} className="">
        <RenderTableHeader headings={headings} className={'border-0'} />
        {items.map((item, index) => {
          if (!item.subItems?.items?.length) {
            return (
              <RenderMainRow
                className={'border-0 px-1'}
                key={`item-${index}`}
                item={item}
                headings={headings}
                device={device}
              />
            );
          }
          return (
            <NestedTable
              key={`item-${index}`}
              item={item}
              headings={headings}
              device={device}
            />
          );
        })}
      </TableContainer>
    </Details>
  );
}

export function TableContainer({
  headings,
  children,
  className,
  ...props
}: { headings: TableColumnHeading[] } & JSX.IntrinsicElements['div']) {
  const Div = 'div';

  return (
    <Div
      {...props}
      className={cn('grid w-full overflow-x-auto', className)}
      style={{
        ...(props.style || {}),
        gridTemplateColumns: headings
          .map((h) =>
            showBothDevices(h)
              ? '140px'
              : h.label === 'Protocol'
                ? '140px'
                : 'minmax(300px, 1fr)',
          )
          .join(' '),
      }}
    >
      {children}
    </Div>
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
      <RenderMainRow
        item={item}
        headings={headings}
        device={device}
        className={'border-b-3 -mx-3 border-x-2 border-t-2'}
      />
      {item.subItems?.items?.length ? (
        <div className="contents">
          <RenderSubItemsHeader headings={headings} />
          <RenderSubItems item={item} headings={headings} device={device} />
        </div>
      ) : null}
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
  return (
    <Details className={cn(renderTableRowContainerCss, '@container  mb-1')}>
      <summary className={cn(renderTableRowContainerCss, '')}>
        <TableContainer headings={headings} className="col-span-full ">
          {headings
            .map((heading, colIndex) => {
              if (!heading.key) return null;
              return (
                <RenderTableCell
                  key={`cell-${heading.key}-${colIndex}`}
                  className="px-6 py-4 text-xs text-left"
                  value={item[heading.key]}
                  heading={heading}
                  device={getItemDevice(item, device)}
                />
              );
            })
            .filter(Boolean)}
        </TableContainer>
      </summary>
        <TableContainer headings={headings} className="col-span-full ">
          {item.subItems?.items?.length ? (
            <RenderSubItems item={item} headings={headings} device={device} />
          ) : null}
      </TableContainer>
    </Details>
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
  const content = headings
    .map((h, colIndex) => {
      const headingKey = h?.subItemsHeading?.key;
      if (!headingKey) {
        return (<div key={`subheading-${colIndex}`} className='col-span-1'></div>);
      }
      const heading = headings.find(({ key }) => key === headingKey);
      if (!heading) {
        return <div key={`subheading-${colIndex}`} className='col-span-1'></div>;
      }

      return (
        <RenderHeading
          key={`subheading-${heading.key || colIndex}`}
          heading={heading}
          className="px-6 py-0.5 text-sm tracking-wider text-muted-foreground col-span-1"
        />
      );
    })
  if (!content.length) return null;
  return (
    <RenderTableRowContainer
      {...props}
      className={cn(renderTableRowContainerCss, 'border-2', props.className)}
    >
      {content}
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
              className="-mx-3 px-6 py-4 text-xs text-left"
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
