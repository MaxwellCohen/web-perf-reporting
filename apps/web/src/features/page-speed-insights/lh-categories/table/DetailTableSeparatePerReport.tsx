"use client";
import { ReportColumns, ReportHeading } from "@/features/page-speed-insights/shared/ReportColumns";
import { OpportunityItem, TableItem } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useIsEmbeddedDetails } from "@/features/page-speed-insights/lh-categories/EmbeddedDetails";
import { TableCard } from "@/features/page-speed-insights/shared/TableCard";
import {
  compareReportLabels,
  formatReportTableTitle,
} from "@/features/page-speed-insights/shared/reportLabels";
import { useStandardTable } from "@/features/page-speed-insights/tanstack-table-v9/useStandardTable";
import type { StockAnyColumnDef } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import {
  flattenDetailItems,
  getAuditId,
  groupRowsByReportLabel,
} from "@/features/page-speed-insights/lh-categories/table/detailTableData";
import {
  createDetailItemColumns,
  getDetailItemsTimeRange,
} from "@/features/page-speed-insights/lh-categories/table/detailItemColumns";

function getSortedReports(rowsByReport: Map<string, DetailTableItem[]>): Array<{
  reportLabel: string;
  reportRows: DetailTableItem[];
  data: (TableItem | OpportunityItem)[];
}> {
  return Array.from(rowsByReport.entries())
    .sort(([labelA], [labelB]) => compareReportLabels(labelA, labelB))
    .map(([reportLabel, reportRows]) => {
      const data = flattenDetailItems(reportRows);

      if (data.length === 0) {
        return null;
      }

      return { reportLabel, reportRows, data };
    })
    .filter((v) => v !== null) as Array<{
    reportLabel: string;
    reportRows: DetailTableItem[];
    data: (TableItem | OpportunityItem)[];
  }>;
}

/** Tables with more rows than this start collapsed so huge audits don't flood the page. */
const OPEN_BY_DEFAULT_MAX_ROWS = 50;

function ReportTableHeading({
  title,
  reportLabel,
  itemCount,
}: {
  title: string;
  reportLabel: string;
  itemCount: number;
}) {
  return (
    <ReportHeading className="text-left">
      <span title={formatReportTableTitle(title, reportLabel, itemCount)}>{reportLabel}</span>
      <span className="ml-2 font-normal tracking-normal normal-case">
        {itemCount} {itemCount === 1 ? "item" : "items"}
      </span>
    </ReportHeading>
  );
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
  const embedded = useIsEmbeddedDetails();
  const rowsByReport = groupRowsByReportLabel(rows);

  const sortedReports = getSortedReports(rowsByReport);
  const auditId = getAuditId(rows);

  if (embedded) {
    return (
      <ReportColumns>
        {sortedReports.map(({ reportLabel, reportRows, data }) => (
          <div key={reportLabel} className="min-w-0 space-y-2">
            <ReportTableHeading title={title} reportLabel={reportLabel} itemCount={data.length} />
            <ReportTable
              reportLabel={reportLabel}
              data={data}
              rows={reportRows}
              auditId={auditId}
            />
          </div>
        ))}
      </ReportColumns>
    );
  }

  const accordionValue = (reportLabel: string) =>
    `${title}-${reportLabel}`.replace(/\s+/g, "-").toLowerCase();
  const openByDefault = sortedReports
    .filter(({ data }) => data.length <= OPEN_BY_DEFAULT_MAX_ROWS)
    .map(({ reportLabel }) => accordionValue(reportLabel));

  return (
    <Accordion
      type="multiple"
      defaultValue={openByDefault}
      className={cn(
        "grid w-full grid-cols-1 items-start gap-x-4",
        sortedReports.length > 1 && "lg:grid-cols-2",
      )}
    >
      {sortedReports.map(({ reportLabel, reportRows, data }) => {
        return (
          <AccordionItem
            key={accordionValue(reportLabel)}
            value={accordionValue(reportLabel)}
            className="min-w-0"
          >
            <AccordionTrigger>
              <ReportTableHeading title={title} reportLabel={reportLabel} itemCount={data.length} />
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
  const timeRange = getDetailItemsTimeRange(data, auditId);
  const reportColumns = createDetailItemColumns({
    rows,
    deviceLabel: reportLabel,
    auditId,
    timeRange,
  });
  const table = useStandardTable({
    data,
    columns: reportColumns as StockAnyColumnDef<TableItem | OpportunityItem>[],
  });

  return <TableCard.Table table={table} />;
}
