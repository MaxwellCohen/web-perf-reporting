import { HorizontalScoreChart } from "@/components/common/PageSpeedGaugeChart";
import { CategoryResult } from "@/lib/schema";

export function CategoryScoreInfo({
  category,
  device,
}: {
  category?: CategoryResult | null;
  device?: string;
}) {
  if (!category?.score) {
    return null;
  }
  return (
    <div className="flex w-full min-w-0 grow flex-col gap-2 align-top hover:no-underline sm:max-w-64">
      <div className="text-center text-xs hover:no-underline">
        {device ? `${device} - ` : ""}
        {Math.round(category.score * 100)}
      </div>
      <HorizontalScoreChart
        score={category.score || 0}
        className="h-2 min-w-0 w-full flex-1 overflow-hidden"
      />
    </div>
  );
}
