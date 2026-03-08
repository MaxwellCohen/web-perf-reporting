'use client';
import { useMemo } from 'react';
import { DataTableNoGrouping } from '@/components/page-speed/lh-categories/table/DataTableNoGrouping';
import { DetailTableItem } from '@/components/page-speed/lh-categories/table/detailTableShared';
import { flattenDetailItems } from '@/components/page-speed/lh-categories/table/detailTableData';
import { createDetailItemColumns } from '@/components/page-speed/lh-categories/table/detailItemColumns';

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
