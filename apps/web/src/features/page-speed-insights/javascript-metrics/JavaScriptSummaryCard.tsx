"use client";
import {
  BytesCountSummaryCard,
  type BytesCountSummaryRow,
} from "@/features/page-speed-insights/shared/BytesCountSummaryCard";

type JavaScriptSummary = {
  label: string;
  totalScripts: number;
  totalTransferSize: number;
  totalResourceSize: number;
};

type JavaScriptSummaryCardProps = {
  stats: JavaScriptSummary[];
};

export function JavaScriptSummaryCard({ stats }: JavaScriptSummaryCardProps) {
  const rows: BytesCountSummaryRow[] = stats.map((s) => ({
    label: s.label,
    count: s.totalScripts,
    totalTransferSize: s.totalTransferSize,
    totalResourceSize: s.totalResourceSize,
  }));
  return (
    <BytesCountSummaryCard title="JavaScript Summary" countColumnTitle="Total Scripts" rows={rows} />
  );
}
