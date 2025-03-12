import { TableColumnHeading } from '@/lib/schema';


export function RenderHeading({
  heading, device, ...props
}: {
  heading?: TableColumnHeading;
  device?: 'Desktop' | 'Mobile';
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props}>
      {typeof heading?.label === 'string'
        ? heading?.label
        : heading?.label?.formattedDefault || ''}
      {device ? `(${device})` : null}
    </div>
  );
}
