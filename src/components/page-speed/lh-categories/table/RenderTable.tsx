import {
  AuditDetailOpportunity,
  AuditDetailTable,
  TableColumnHeading,
} from '@/lib/schema';
import { cn } from '@/lib/utils';
import { getEntityGroupItems } from './getEntityGroupItems';
import { RenderTableItems } from './RenderTableItems';
import { RenderEntityGroupRows } from './RenderEntityGroupRows';
import { RenderHeading } from './RenderHeading';

export function DetailTable({
  mobileDetails,
  desktopDetails,
}: {
  mobileDetails?: AuditDetailOpportunity | AuditDetailTable;
  desktopDetails?: AuditDetailOpportunity | AuditDetailTable;
}) {
  const items = desktopDetails?.items || [];
  const headings = desktopDetails?.headings;
  const isEntityGrouped = !!desktopDetails?.isEntityGrouped;
  const skipSumming =
    desktopDetails?.skipSumming || mobileDetails?.skipSumming || [];
  const sortedBy = desktopDetails?.sortedBy || mobileDetails?.sortedBy;

  const device = 'Desktop';
  if (!items?.length) return null;
  // if (!headings?.length && mobileDetails?.headings?.length) return null;

  const entityItems = getEntityGroupItems({
    items,
    headings,
    isEntityGrouped,
    skipSumming,
    sortedBy,
  });

  return (
    <>
      {entityItems.length > 0 ? (
        <RenderEntityGroupRows
          entityItems={entityItems}
          headings={headings}
          device={device}
          items={items}
        />
      ) : (
        <RenderTableItems
          desktopHeadings={desktopDetails?.headings}
          desktopItems={desktopDetails?.items}
          mobileHeadings={desktopDetails?.headings}
          mobileItems={mobileDetails?.items}
        />
      )}
    </>
  );
}



export function RenderTableHeader({ headings }: { headings: TableColumnHeading[] }) {
  return (
    <RenderTableRowContainer headings={headings}>
      {headings.map((heading, index) => {
        return (
          <RenderHeading
            key={index}
            heading={heading}
            className="grid-col-span-1 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
          />
        );
      })}
    </RenderTableRowContainer>
  );
}

export function RenderTableRowContainer({
  children,
  headings,
  ...props
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


