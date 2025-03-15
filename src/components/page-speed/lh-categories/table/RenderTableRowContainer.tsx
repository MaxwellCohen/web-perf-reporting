
import { cn } from '@/lib/utils';



export const renderTableRowContainerCss = 'grid grid-cols-subgrid border-b-2 items-center col-span-full hover:bg-muted/50';

export function RenderTableRowContainer({
  children, className, ...props
}: {
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(renderTableRowContainerCss, className)}
    >
      {children}
    </div>
  );
}
