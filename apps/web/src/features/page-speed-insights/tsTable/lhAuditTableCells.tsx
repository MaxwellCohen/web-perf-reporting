"use client";
import type { StockCellContext } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import ReactMarkdown from "react-markdown";
import { HorizontalScoreChart } from "@/components/common/PageSpeedGaugeChart";
import type { TableDataItem } from "@/features/page-speed-insights/tsTable/TableDataItem";
export function LHCategoryTitleCell(props: StockCellContext<TableDataItem, string>) {
  const category =
    props.column.id === props.row.groupingColumnId
      ? String(props.row.groupingValue ?? "")
      : props.getValue<string>();
  return <div className="basis-48 text-xl font-bold">{category}</div>;
}

export function LHCategoryScoreCell(props: StockCellContext<TableDataItem, string | string[]>) {
  const raw = props.getValue<string | string[]>();
  if (!raw || props.row.groupingValue === "Core Web Vitals") {
    return null;
  }
  const value = Array.isArray(raw) ? raw : [raw];

  return value.map((v: string) => {
    const [scoreStr = 0, label = ""] = v.split(":::");
    const score = +scoreStr;
    return (
      <div key={v} className="flex flex-row items-center gap-2">
        <div className="flex-0 flex grow w-64 flex-col gap-2 align-top hover:no-underline">
          <div className="text-center text-xs hover:no-underline">
            {label ? `${label} - ` : ""}
            {Math.round(score * 100)}
          </div>
          <HorizontalScoreChart
            score={score || 0}
            className="h-2 min-w-11 flex-1 overflow-hidden"
          />
        </div>
      </div>
    );
  });
}

export function LHAuditDescriptionCell(
  props: StockCellContext<TableDataItem, string | undefined>,
) {
  const str = props.getValue<string | undefined>()?.toString() || "";
  if (!str) {
    return null;
  }
  return (
    <div className="text-sm font-normal">
      <ReactMarkdown>{props.getValue<string | undefined>()?.toString() || ""}</ReactMarkdown>
    </div>
  );
}
