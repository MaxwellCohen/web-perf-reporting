'use client';
import { useMemo } from 'react';
import { DataTableNoGrouping } from '@/features/page-speed-insights/lh-categories/table/DataTableNoGrouping';
import { DetailTableItem } from '@/features/page-speed-insights/lh-categories/table/detailTableShared';
import { flattenDetailItems } from '@/features/page-speed-insights/lh-categories/table/detailTableData';
import { createDetailItemColumns } from '@/features/page-speed-insights/lh-categories/table/detailItemColumns';

export function DetailTableWith1ReportAndNoSubitem({
  rows, title,
}: {
  rows: DetailTableItem[];
  title: string;
}) {
  const data = useMemo(() => flattenDetailItems(rows), [rows]);
  const columns = useMemo(
    () => createDetailItemColumns({ rows, deviceLabel: rows[0]?._userLabel || '' }),
    [rows],
  );

  if (!data.length) {
    return null;
  }
  return <DataTableNoGrouping data={data} columns={columns} title={title} />;
}
