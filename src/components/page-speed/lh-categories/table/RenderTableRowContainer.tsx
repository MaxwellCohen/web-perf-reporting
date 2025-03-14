
import { cn } from '@/lib/utils';




export function RenderTableRowContainer({
  children, className, ...props
}: {
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn('grid grid-cols-subgrid border-b-2 items-center col-span-full', className)}
    >
      {children}
    </div>
  );
}
