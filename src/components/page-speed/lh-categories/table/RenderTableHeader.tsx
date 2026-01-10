import { TableColumnHeading } from '@/lib/schema';
import { RenderHeading } from '@/components/page-speed/lh-categories/table/RenderHeading';
import { RenderTableRowContainer } from '@/components/page-speed/lh-categories/table/RenderTableRowContainer';

export function RenderTableHeader({
  headings,
  ...props
}: {
  headings: TableColumnHeading[];
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <RenderTableRowContainer {...props}>
      {headings.map((heading, index) => {
        return (
          <RenderHeading
            key={index}
            heading={heading}
            className="grid-col-span-1 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
          />
        );
      })}
    </RenderTableRowContainer>
  );
}
