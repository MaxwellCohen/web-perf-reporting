"use client";
import { OpportunityItem, TableItem } from "@/lib/schema";
import { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { StockDataTable } from "@/features/page-speed-insights/tanstack-table-v9/StockDataTable";
import {
  compareReportLabels,
  formatReportTableTitle,
  splitReportLabel,
} from "@/features/page-speed-insights/shared/reportLabels";
import {
  useSimpleTable,
  type FlatColumnDef,
} from "@/features/page-speed-insights/tanstack-table-v9/useSimpleTable";
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
  const { run, device } = splitReportLabel(reportLabel);
  return (
    <div
      className="flex flex-wrap items-center gap-2 text-left"
      title={formatReportTableTitle(title, reportLabel, itemCount)}
    >
      {run ? <LabelChip name="Run" value={run} /> : null}
      <LabelChip name="Device" value={device} />
      <span className="text-sm text-muted-foreground">
        {itemCount} {itemCount === 1 ? "item" : "items"}
      </span>
    </div>
  );
}

function LabelChip({ name, value }: { name: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border bg-muted/30 px-2 py-0.5 text-sm">
      <span className="text-muted-foreground">{name}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

/**
 * Component that renders one table per report for audits configured to show separate tables.
 * This is useful for audits like dom-size-insight where you want to see each report's data separately.
 */
export function DetailTableSeparatePerReport({
  rows,
  title,
  embedded = false,
}: {
  rows: DetailTableItem[];
  title: string;
  embedded?: boolean;
}) {
  const rowsByReport = groupRowsByReportLabel(rows);

  const sortedReports = getSortedReports(rowsByReport);
  const auditId = getAuditId(rows);

  if (embedded) {
    return (
      <div className="space-y-4">
        {sortedReports.map(({ reportLabel, reportRows, data }) => (
          <div key={reportLabel}>
            <h5 className="mb-2">
              <ReportTableHeading title={title} reportLabel={reportLabel} itemCount={data.length} />
            </h5>
            <ReportTable reportLabel={reportLabel} data={data} rows={reportRows} auditId={auditId} />
          </div>
        ))}
      </div>
    );
  }

  const accordionValue = (reportLabel: string) =>
    `${title}-${reportLabel}`.replace(/\s+/g, "-").toLowerCase();
  const openByDefault = sortedReports
    .filter(({ data }) => data.length <= OPEN_BY_DEFAULT_MAX_ROWS)
    .map(({ reportLabel }) => accordionValue(reportLabel));

  return (
    <Accordion type="multiple" defaultValue={openByDefault} className="w-full">
      {sortedReports.map(({ reportLabel, reportRows, data }) => {
        return (
          <AccordionItem key={accordionValue(reportLabel)} value={accordionValue(reportLabel)}>
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
  const table = useSimpleTable({
    data,
    columns: reportColumns as FlatColumnDef<TableItem | OpportunityItem>[],
  });

  return (
    <div className="w-full overflow-x-auto">
      <StockDataTable table={table} />
    </div>
  );
}
