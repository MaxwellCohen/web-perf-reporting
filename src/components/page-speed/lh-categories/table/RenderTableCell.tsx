import { DeviceType, ItemValue, TableColumnHeading } from '@/lib/schema';
import { RenderTableValue } from '@/components/page-speed/lh-categories/table/RenderTableValue';

export function RenderTableCell({
  value,
  heading,
  device,
  ...props
}: {
  value?: ItemValue;
  heading: TableColumnHeading | null;
  device: DeviceType;
} & React.HTMLAttributes<HTMLDivElement>) {
  return <RenderTableValue value={value} heading={heading} device={device} {...props} />;
}
