import { AuditDetailOpportunity, AuditDetailTable } from '@/lib/schema';
import {
  getTableItemSortComparator,
  shouldGroupEntity,
} from './getEntityGroupItems';
import { RenderBasicTable } from './RenderBasicTable';
import { RenderEntityTable } from './RenderEntityTable';
import { mergedTable } from './utils';
import { useMemo } from 'react';

export function DetailTable({
  mobileDetails,
  desktopDetails,
}: {
  mobileDetails?: AuditDetailOpportunity | AuditDetailTable;
  desktopDetails?: AuditDetailOpportunity | AuditDetailTable;
}) {
   const { items, headings, device, sortedBy } = useMemo(() => {
    const [_headings, _items, _device] = mergedTable(
    desktopDetails?.items,
    mobileDetails?.items,
    mobileDetails?.headings,
    desktopDetails?.headings,
  );
  const _sortedBy = combineAndDedupe(
    desktopDetails?.sortedBy,
    mobileDetails?.sortedBy,
  );
  if (_sortedBy.length) {
    _items.sort(getTableItemSortComparator(_sortedBy));
  }
  return {
    items: _items,
    headings: _headings,
    device: _device,
    sortedBy: _sortedBy,
  }
}, [desktopDetails, mobileDetails]);
  const isEntityGrouped =
    !!desktopDetails?.isEntityGrouped || !!mobileDetails?.isEntityGrouped;
  const shouldRenderEntityTable = shouldGroupEntity(items, isEntityGrouped);
  const skipSumming = combineAndDedupe(
    desktopDetails?.skipSumming,
    mobileDetails?.skipSumming,
  );
  

  return (
    <>
      {shouldRenderEntityTable ? (
        <RenderEntityTable
          headings={headings}
          device={device}
          items={items}
          isEntityGrouped={isEntityGrouped}
          skipSumming={skipSumming}
          sortedBy={sortedBy}
        />
      ) : (
        <RenderBasicTable headings={headings} items={items} device={device} />
      )}
    </>
  );
}

function combineAndDedupe<T>(a?: T[], b?: T[]): T[] {
  return [...new Set([...(a || []), ...(b || [])])];
}
