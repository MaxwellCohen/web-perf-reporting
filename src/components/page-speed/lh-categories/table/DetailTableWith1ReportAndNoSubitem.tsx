'use client';
import { TableItem, OpportunityItem } from '@/lib/schema';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { toTitleCase } from '../../toTitleCase';
import { DataTableNoGrouping } from './DataTableNoGrouping';
import { DetailTableItem, canSort, canGroup, isNumberColumn, simpleTableCell } from './RenderTable';

export function DetailTableWith1ReportAndNoSubitem({
  rows, title,
}: {
  rows: DetailTableItem[];
  title: string;
}) {
  const data = useMemo(() => {
    return rows.flatMap((r) => {
      return (r.auditResult?.details?.items || []).map((i) => i);
    });
  }, [rows]);
  const columns = useMemo(() => {
    const sColumnHelper = createColumnHelper<TableItem | OpportunityItem>();

    return rows.flatMap((r) => r.auditResult.details.headings
      .map((h, i) => {
        if (!h.key) {
          return null;
        }
        const key = h.key as keyof TableItem
        return sColumnHelper.accessor((r) => r[key] ?? undefined, {
          id: `${i}_${key}`,
          header: `${h.label || toTitleCase(key as string)}`,
          enableSorting: canSort(h.valueType),
          sortingFn: 'alphanumeric',
          enableColumnFilter: canGroup(h.valueType) || isNumberColumn(h.valueType),
          filterFn: canGroup(h.valueType)
            ? 'includesString'
            : isNumberColumn(h.valueType)
              ? 'inNumberRange'
              : undefined,
          enableResizing: true,
          minSize: 200,
          cell: simpleTableCell,
          meta: {
            heading: { heading: h },
          },
        });
      })
      .filter((v) => !!v)
    );
  }, [rows]);

  if (!data.length) {
    return null;
  }
  return <DataTableNoGrouping data={data} columns={columns} title={title} />;
}
