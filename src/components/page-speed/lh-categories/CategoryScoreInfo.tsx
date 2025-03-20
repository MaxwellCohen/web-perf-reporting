import { HorizontalScoreChart } from "@/components/common/PageSpeedGaugeChart";
import { CategoryResult } from "@/lib/schema";

export function CategoryScoreInfo({
    category,
    device,
  }: {
    category?: CategoryResult | null;
    device: 'Mobile' | 'Desktop';
  }) {
    if (!category?.score) {
      return null;
    }
    return (
      <div className="flex-0 flex w-64 flex-col gap-2 align-top hover:no-underline">
        <div className="text-center text-xs hover:no-underline">
          {device} - {Math.round(category.score * 100)}
        </div>
        <HorizontalScoreChart
          score={category.score || 0}
          className="h-2 min-w-11 flex-1 overflow-hidden"
        />
      </div>
    );
  }