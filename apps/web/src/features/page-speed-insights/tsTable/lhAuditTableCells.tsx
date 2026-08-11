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
  return <div className="w-full min-w-0 basis-full text-lg font-bold sm:basis-48 sm:text-xl">{category}</div>;
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
      <div key={v} className="flex w-full min-w-0 flex-row items-center gap-2 sm:w-auto sm:max-w-64 sm:flex-1">
        <div className="flex w-full min-w-0 grow flex-col gap-2 align-top hover:no-underline sm:max-w-64">
          <div className="text-center text-xs hover:no-underline">
            {label ? `${label} - ` : ""}
            {Math.round(score * 100)}
          </div>
          <HorizontalScoreChart
            score={score || 0}
            className="h-2 min-w-0 w-full flex-1 overflow-hidden"
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
