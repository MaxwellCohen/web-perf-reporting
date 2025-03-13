import { TableColumnHeading } from '@/lib/schema';
import { cn } from '@/lib/utils';




export function RenderTableRowContainer({
  children, headings, ...props
}: {
  children: React.ReactNode;
  headings: TableColumnHeading[];
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn('grid grid-cols-subgrid border-b-2', props.className)}
      style={{
        gridColumn: `span ${headings.length} / span ${headings.length}`,
      }}
    >
      {children}
    </div>
  );
}
