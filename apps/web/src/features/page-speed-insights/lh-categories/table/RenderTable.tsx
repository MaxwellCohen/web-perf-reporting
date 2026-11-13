import type { ReactElement } from "react";
import { AuditTableViz } from "@/features/page-speed-insights/audit-viz/AuditTableViz";
import { shouldShowSeparateTablesPerReport } from "@/features/page-speed-insights/auditTableConfig";
import { MainThreadWorkBreakdownTable } from "@/features/page-speed-insights/javascript-metrics/MainThreadWorkBreakdownTable";
import { buildMainThreadWorkTableFromDetailRows } from "@/features/page-speed-insights/javascript-metrics/mainThreadWorkTable";
import { LCPBreakdownTable } from "@/features/page-speed-insights/network-metrics/LCPBreakdownTable";
import { buildLcpBreakdownTableFromDetailRows } from "@/features/page-speed-insights/network-metrics/lcpBreakdownSelectors";
import { DataTableNoGrouping } from "@/features/page-speed-insights/lh-categories/table/DataTableNoGrouping";
import { createDetailItemColumns } from "@/features/page-speed-insights/lh-categories/table/detailItemColumns";
import type { StockAnyColumnDef } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import type { OpportunityItem, TableItem } from "@/lib/schema";
import { DetailTableSeparatePerReport } from "@/features/page-speed-insights/lh-categories/table/DetailTableSeparatePerReport";
import { DetailTableWithSubitems } from "@/features/page-speed-insights/lh-categories/table/DetailTableWithSubitems";
import { DetailTableFull } from "@/features/page-speed-insights/lh-categories/table/DetailTableFull";
import {
  flattenDetailItems,
  getAuditId,
  hasDetailItems,
  hasDetailSubitems,
} from "@/features/page-speed-insights/lh-categories/table/detailTableData";
import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";

/**
 * Main component that routes to the appropriate table implementation
 * based on the data structure and audit configuration
 */
export function DetailTable({ rows, title }: { rows: DetailTableItem[]; title: string }) {
  const hasItems = hasDetailItems(rows);

  if (!hasItems) {
    return null;
  }

  const auditId = getAuditId(rows);
  const viz = <AuditTableViz rows={rows} />;

  if (auditId === "lcp-breakdown-insight") {
    const breakdown = buildLcpBreakdownTableFromDetailRows(rows);
    if (!breakdown) return viz;

    return (
      <div className="w-full min-w-0 space-y-2">
        {viz}
        <div className="w-full overflow-x-auto">
          <LCPBreakdownTable
            tableRows={breakdown.tableRows}
            reportLabels={breakdown.reportLabels}
          />
        </div>
      </div>
    );
  }

  if (auditId === "mainthread-work-breakdown") {
    const breakdown = buildMainThreadWorkTableFromDetailRows(rows);
    if (!breakdown) return viz;

    return (
      <div className="w-full min-w-0 space-y-4">
        {viz}
        <div className="w-full overflow-x-auto">
          <MainThreadWorkBreakdownTable
            rows={breakdown.rows}
            reportLabels={breakdown.reportLabels}
          />
        </div>
      </div>
    );
  }

  if (auditId && shouldShowSeparateTablesPerReport(auditId)) {
    return (
      <div className="w-full min-w-0 space-y-4">
        {viz}
        <DetailTableSeparatePerReport rows={rows} title={title} />
      </div>
    );
  }

  const showUserLabel = rows.length > 1;
  const hasSubitems = hasDetailSubitems(rows);

  // Route to appropriate table component based on data structure
  let table: ReactElement | null = null;
  if (!showUserLabel) {
    if (!hasSubitems) {
      const data = flattenDetailItems(rows);
      const columns = createDetailItemColumns({ rows, deviceLabel: rows[0]?._userLabel || "" });
      table = data.length ? (
        <DataTableNoGrouping
          data={data}
          columns={columns as StockAnyColumnDef<TableItem | OpportunityItem>[]}
          title={title}
        />
      ) : null;
    } else {
      table = <DetailTableWithSubitems rows={rows} title={title} />;
    }
  } else {
    table = <DetailTableFull rows={rows} />;
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      {viz}
      {table}
    </div>
  );
}
