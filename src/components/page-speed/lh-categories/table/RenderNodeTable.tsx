import {
  TableItem,
  TableColumnHeading,
  NodeValue,
  DeviceType,
} from '@/lib/schema';
import { Card } from '@/components/ui/card';
import { RenderNodeImage } from '@/components/page-speed/lh-categories/table/RenderNode';
import { RenderTableCell } from '@/components/page-speed/lh-categories/table/RenderTableCell';
import { Details } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

export function RenderNodeTable({
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
  const nodeHeader = headings.find((h) => h.valueType === 'node');
  if (!nodeHeader?.key && typeof nodeHeader?.key !== 'string') {
    return null;
  }

  return (
    <Details  className="w-full @container">
      <summary className="flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          <div className="text-lg font-bold">{title} details</div>
        </div>
      </summary>
      <div className="grid grid-cols-1 gap-3">
        {items.map((item, index) => {
          const info = extraInfo(headings, item, device);
          return (
            <Card
              key={`item-${index}`}
              className={cn("grid grid-cols-1 gap-2 w-full px-2", {"md:grid-cols-[75%_25%]": info.length})}
            >
              <div className="col-span-full p-2">
                Form Factor: {getItemDevice(item, device)}
              </div>
              <NodeComponent
                item={item[nodeHeader.key || ''] as NodeValue}
                device={getItemDevice(item, device)}
              />
              {info.length ? (
                <div className="flex flex-col gap-2 px-2 pt-4">{info}</div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </Details>
  );
}

const extraInfo = (
  headings: TableColumnHeading[],
  item: TableItem,
  device: DeviceType,
) => {
  return headings
    .map((heading, colIndex) => {
      if (!heading.key) return null;
      if (heading?.valueType === 'node') return null;
      if (!item[heading.key]) return null;
      // if (!heading.key.includes(getItemDevice(item, device))) return null;
      return (
        <div
          className="flex flex-row justify-between pb-4 align-middle"
          key={`cell-${heading.key}-${colIndex}`}
        >
          <span className="break-words">
            {typeof heading.label === 'string'
              ? heading.label
              : heading.label?.formattedDefault || ''}
            :
          </span>
          <RenderTableCell
            className="inline-block text-xs"
            value={item[heading.key]}
            heading={heading}
            device={getItemDevice(item, device)}
          />
        </div>
      );
    })
    .filter(Boolean);
};

const getItemDevice = (item: TableItem, device: DeviceType): DeviceType =>
  (item._device as DeviceType) || device;

export function NodeComponent({
  item,
  device,
}: {
  item: NodeValue;
  device: DeviceType;
}) {
  if (!item) return null;
  const NodeImage = <RenderNodeImage item={item} device={device} />;
  return (
    <div
      className={cn('grid gap-2', {
        'grid-cols-[200px_1fr]': NodeImage,
        'grid-cols-1': !NodeImage,
      })}
    >
      {item?.type === 'text' ? (
        <h3 className="col-span-full px-2 pt-6 text-lg font-bold">
          {item.value}{' '}
        </h3>
      ) : null}
      {NodeImage}
      <div className="flex flex-col gap-2 md:self-baseline">
        {item.nodeLabel ? <div className="px-2">{item.nodeLabel}</div> : null}
        {item.snippet && (
          <div className="whitespace-pre-wrap break-all px-2 font-mono text-sm leading-5 text-blue-500">
            {item.snippet}
          </div>
        )}
      </div>
    </div>
  );
}
