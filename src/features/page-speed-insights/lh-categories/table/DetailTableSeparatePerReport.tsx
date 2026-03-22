'use client';
import { OpportunityItem, TableItem } from '@/lib/schema';
import { useMemo } from 'react';
import { DetailTableItem } from '@/features/page-speed-insights/lh-categories/table/detailTableShared';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Table } from '@/components/ui/table';
import { DataTableHeader } from '@/features/page-speed-insights/lh-categories/table/DataTableHeader';
import { DataTableBody } from '@/features/page-speed-insights/lh-categories/table/DataTableBody';
import {
  compareReportLabels,
  formatReportTableTitle,
} from '@/features/page-speed-insights/shared/reportLabels';
import { useSimpleTable } from '@/features/page-speed-insights/shared/useSimpleTable';
import {
  flattenDetailItems,
  getAuditId,
  groupRowsByReportLabel,
} from '@/features/page-speed-insights/lh-categories/table/detailTableData';
import {
  createDetailItemColumns,
  getDetailItemsTimeRange,
} from '@/features/page-speed-insights/lh-categories/table/detailItemColumns';

function getSortedReports(
  rowsByReport: Map<string, DetailTableItem[]>
): Array<{ reportLabel: string; reportRows: DetailTableItem[]; data: (TableItem | OpportunityItem)[] }> {
  return Array.from(rowsByReport.entries())
    .sort(([labelA], [labelB]) => compareReportLabels(labelA, labelB))
    .map(([reportLabel, reportRows]) => {
      const data = flattenDetailItems(reportRows);

      if (data.length === 0) {
        return null;
      }

      return { reportLabel, reportRows, data };
    })
    .filter((v) => v !== null) as Array<{ reportLabel: string; reportRows: DetailTableItem[]; data: (TableItem | OpportunityItem)[] }>;
}

/**
 * Component that renders one table per report for audits configured to show separate tables.
 * This is useful for audits like dom-size-insight where you want to see each report's data separately.
 */
export function DetailTableSeparatePerReport({
  rows,
  title,
}: {
  rows: DetailTableItem[];
  title: string;
}) {
  const rowsByReport = useMemo(() => groupRowsByReportLabel(rows), [rows]);

  const sortedReports = getSortedReports(rowsByReport);
  const auditId = getAuditId(rows);

  return (
    <Accordion type="single" collapsible className="w-full">
      {sortedReports.map(({ reportLabel, reportRows, data }) => {
        const accordionValue = `${title}-${reportLabel}`.replace(/\s+/g, '-').toLowerCase();
        const reportTitle = formatReportTableTitle(title, reportLabel, data.length);
        return (
          <AccordionItem key={accordionValue} value={accordionValue}>
            <AccordionTrigger>
              <div className="text-base font-semibold text-left">
                {reportTitle}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <ReportTable
                reportLabel={reportLabel}
                data={data}
                rows={reportRows}
                auditId={auditId}
              />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

function ReportTable({
  reportLabel,
  data,
  rows,
  auditId,
}: {
  reportLabel: string;
  data: Array<TableItem | OpportunityItem>;
  rows: DetailTableItem[];
  auditId?: string;
}) {
  'use no memo';
  const timeRange = useMemo(
    () => getDetailItemsTimeRange(data, auditId),
    [auditId, data],
  );
  const reportColumns = useMemo(
    () =>
      createDetailItemColumns({
        rows,
        deviceLabel: reportLabel,
        auditId,
        timeRange,
      }),
    [auditId, reportLabel, rows, timeRange],
  );
  const table = useSimpleTable({ data, columns: reportColumns });

  return (
    <div className="w-full overflow-x-auto">
      <Table className="w-full" style={{ width: '100%' }}>
        <DataTableHeader table={table} />
        <DataTableBody table={table} />
      </Table>
    </div>
  );
}