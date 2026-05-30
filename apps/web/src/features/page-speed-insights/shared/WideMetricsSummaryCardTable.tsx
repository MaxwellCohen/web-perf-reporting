import type { ReactNode } from "react";

import { CardWithTable } from "@/features/page-speed-insights/shared/CardWithTable";
import { wideMetricsCardTableProps } from "@/features/page-speed-insights/shared/wideMetricsCardTableProps";

type WideMetricsSummaryCardTableProps = {
  title: string;
  tableClassName: string;
  header: ReactNode;
  children: ReactNode;
};

/** Full-width multi-report metric table inside a card (PSI dashboard grid). */
export function WideMetricsSummaryCardTable({
  title,
  tableClassName,
  header,
  children,
}: WideMetricsSummaryCardTableProps) {
  return (
    <CardWithTable
      title={title}
      {...wideMetricsCardTableProps}
      tableClassName={tableClassName}
      header={header}
    >
      {children}
    </CardWithTable>
  );
}
