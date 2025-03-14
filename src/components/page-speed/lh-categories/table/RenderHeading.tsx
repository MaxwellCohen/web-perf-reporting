import { TableColumnHeading } from '@/lib/schema';


export function RenderHeading({
  heading,  ...props
}: {
  heading?: TableColumnHeading;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props}>
      {typeof heading?.label === 'string'
        ? heading?.label
        : heading?.label?.formattedDefault || ''}
        {heading?._device ? <><br /><span className='text-xs'>({heading?._device || ''})</span></> : null}
    </div>
  );
}
