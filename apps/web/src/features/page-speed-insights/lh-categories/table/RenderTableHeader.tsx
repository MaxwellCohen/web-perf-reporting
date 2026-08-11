import { TableColumnHeading } from "@/lib/schema";
import { RenderHeading } from "@/features/page-speed-insights/lh-categories/table/RenderHeading";
import { RenderTableRowContainer } from "@/features/page-speed-insights/lh-categories/table/RenderTableRowContainer";
import { GridColumnResizer } from "@/features/page-speed-insights/lh-categories/table/gridColumnResize";
import { cn } from "@/lib/utils";

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
          <div key={index} className="relative min-w-0">
            <RenderHeading
              heading={heading}
              className={cn(
                "grid-col-span-1 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground",
              )}
            />
            <GridColumnResizer columnIndex={index} />
          </div>
        );
      })}
    </RenderTableRowContainer>
  );
}
