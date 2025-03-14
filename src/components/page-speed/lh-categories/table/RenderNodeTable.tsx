import { TableItem, TableColumnHeading, NodeValue, DeviceType } from '@/lib/schema';
import { Card } from '@/components/ui/card';
import { RenderNodeImage } from './RenderNode';
import { RenderTableCell } from './RenderTableCell';


export function RenderNodeTable({
  headings,
  items,
  device,
}: {
  headings: TableColumnHeading[];
  items: TableItem[];
  device: DeviceType;
}) {
  const nodeHeader = headings.find((h) => h.valueType === 'node');
  if (!nodeHeader?.key && typeof nodeHeader?.key !== 'string') {
    return null;
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fit,_300px)] gap-3">
      {items.map((item, index) => (
        <Card key={`item-${index}`} className='w-300px'>
          <NodeComponent
            item={item[nodeHeader.key || ''] as NodeValue}
            device={getItemDevice(item, device)}
          />
          <div className="flex flex-col gap-2 pt-4 px-2">
            <div >{(item[nodeHeader.key || ''] as NodeValue)?.nodeLabel}</div>
            <div >Form Factor: {getItemDevice(item, device)}</div>
            {headings.map((heading, colIndex) => {
              if (!heading.key) return null;
              if (heading?.valueType === 'node') return null;
              if (!item[heading.key]) return null;
              return (
                <div  className="flex flex-col  pb-4" key={`cell-${heading.key}-${colIndex}`}>
                  <span className='break-words'>
                    {typeof heading.label === 'string'
                      ? heading.label
                      : heading.label?.formattedDefault || ''} :
                  </span>
                  <RenderTableCell
                    className="text-xs"
                    value={item[heading.key]}
                    heading={heading}
                    device={getItemDevice(item, device)}
                  />
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}

const getItemDevice = (item: TableItem, device: DeviceType): DeviceType =>
  (item._device as DeviceType) || device;

export function NodeComponent({
  item,
  device,
}: {
  item: NodeValue;
  device: DeviceType;
}) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {item.type === 'text' ? <h3 className='text-lg font-bold px-2 pt-6'>{item.value} </h3>: ''}
      <RenderNodeImage item={item} device={device} />
      <div className="flex flex-col gap-2 md:self-baseline">
          {item.nodeLabel ? <div className='px-2'>{item.nodeLabel}</div> : null}
          {item.snippet && (
            <div className="whitespace-pre-wrap font-mono text-sm px-2 leading-5 text-blue-500 break-all">
              {item.snippet}
            </div>
          )}
          {}
        </div> 
    </div>
  );
}
