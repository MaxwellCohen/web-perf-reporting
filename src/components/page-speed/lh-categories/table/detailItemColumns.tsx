import { ItemValue, OpportunityItem, TableItem } from '@/lib/schema';
import { createColumnHelper, ColumnDef } from '@tanstack/react-table';
import { RenderTableValue } from '@/components/page-speed/lh-categories/table/RenderTableValue';
import {
  canGroup,
  canSort,
  DetailTableItem,
  isNumberColumn,
} from '@/components/page-speed/lh-categories/table/detailTableShared';
import { toTitleCase } from '@/components/page-speed/toTitleCase';
import { NetworkWaterfallCell } from '@/components/page-speed/lh-categories/table/NetworkWaterfallCell';
import {
  getNetworkRequestsTimeRange,
  isNetworkRequestsAudit,
  NETWORK_REQUESTS_COLUMN_ORDER,
  NetworkRequestTimeRange,
  sortHeadingsByKeyOrder,
  WATERFALL_REPLACED_NETWORK_REQUEST_KEYS,
} from '@/components/page-speed/shared/networkRequestsTable';

type DetailRowValue = TableItem | OpportunityItem;

type DetailItemColumnsOptions = {
  rows: DetailTableItem[];
  deviceLabel: string;
  auditId?: string;
  timeRange?: NetworkRequestTimeRange | null;
};

const columnHelper = createColumnHelper<DetailRowValue>();

function buildBaseColumns(
  rows: DetailTableItem[],
  deviceLabel: string,
  auditId?: string,
): ColumnDef<DetailRowValue, ItemValue | undefined>[] {
  const headingsById = new Map<string, ColumnDef<DetailRowValue, ItemValue | undefined>>();

  rows.forEach((row) => {
    let headingsToUse = row.auditResult.details.headings;

    if (isNetworkRequestsAudit(auditId)) {
      headingsToUse = sortHeadingsByKeyOrder(
        headingsToUse.filter(
          (heading) =>
            heading.key != null &&
            !WATERFALL_REPLACED_NETWORK_REQUEST_KEYS.includes(heading.key),
        ),
        NETWORK_REQUESTS_COLUMN_ORDER,
      );
    }

    headingsToUse.forEach((heading, index) => {
      if (!heading.key) {
        return;
      }

      const key = heading.key as keyof TableItem;
      const columnId = `${index}_${key}`;

      if (headingsById.has(columnId)) {
        return;
      }

      const headerLabel =
        typeof heading.label === 'string'
          ? heading.label
          : heading.label?.formattedDefault ?? toTitleCase(key as string);
      headingsById.set(
        columnId,
        columnHelper.accessor((value) => value[key] ?? undefined, {
          id: columnId,
          header: headerLabel,
          enableSorting: canSort(heading.valueType),
          sortingFn: 'alphanumeric',
          enableColumnFilter:
            canGroup(heading.valueType) || isNumberColumn(heading.valueType),
          filterFn: canGroup(heading.valueType)
            ? 'includesString'
            : isNumberColumn(heading.valueType)
              ? 'inNumberRange'
              : undefined,
          enableResizing: true,
          minSize: 200,
          cell: (info) => (
            <RenderTableValue
              value={info.getValue() as ItemValue}
              heading={heading}
              device={deviceLabel}
            />
          ),
          meta: {
            heading: { heading },
          },
        }),
      );
    });
  });

  return Array.from(headingsById.values());
}

export function createDetailItemColumns({
  rows,
  deviceLabel,
  auditId,
  timeRange,
}: DetailItemColumnsOptions): ColumnDef<DetailRowValue, ItemValue | undefined>[] {
  const columns = buildBaseColumns(rows, deviceLabel, auditId);

  if (!isNetworkRequestsAudit(auditId) || !timeRange) {
    return columns;
  }

  const waterfallColumn = columnHelper.display({
    id: 'waterfall',
    header: 'Waterfall',
    enableSorting: false,
    enableColumnFilter: false,
    enableResizing: true,
    minSize: 120,
    size: 300,
    cell: (info) => {
      const row = info.row.original as TableItem & {
        networkRequestTime?: number;
        networkEndTime?: number;
        resourceType?: string;
      };
      const start =
        typeof row.networkRequestTime === 'number' ? row.networkRequestTime : 0;
      const end = typeof row.networkEndTime === 'number' ? row.networkEndTime : start;

      return (
        <NetworkWaterfallCell
          requestTime={start}
          endTime={end}
          minStart={timeRange.minStart}
          maxEnd={timeRange.maxEnd}
          resourceType={
            typeof row.resourceType === 'string' ? row.resourceType : undefined
          }
          showTimeLabels
        />
      );
    },
  });

  return [...columns, waterfallColumn];
}

export function getDetailItemsTimeRange(
  rows: Array<TableItem | OpportunityItem>,
  auditId?: string,
): NetworkRequestTimeRange | null {
  if (!isNetworkRequestsAudit(auditId)) {
    return null;
  }

  return getNetworkRequestsTimeRange(rows as TableItem[]);
}
