import { CopyButton } from "@/components/ui/copy-button";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";

type PageSpeedInsightsCopyButtonsProps = {
  items: InsightsContextItem[];
};

export function PageSpeedInsightsCopyButtons({ items }: PageSpeedInsightsCopyButtonsProps) {
  return (
    <div className="flex flex-wrap justify-end gap-2 px-3 sm:gap-4">
      {items.map((item) => (
        <CopyButton
          key={item.label}
          size="lg"
          className="min-w-0 max-w-full"
          text={JSON.stringify(item.item) || ""}
        >
          <span className="truncate">{item.label}</span>
        </CopyButton>
      ))}
    </div>
  );
}
