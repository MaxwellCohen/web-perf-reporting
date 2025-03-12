import { ItemValue, TableColumnHeading } from '@/lib/schema';
import { RenderTableValue } from './RenderTableValue';


export function RenderTableCell({
  value, heading, device, ...props
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
