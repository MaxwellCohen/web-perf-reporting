import { CopyButton } from "@/components/ui/copy-button";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";

type PageSpeedInsightsCopyButtonsProps = {
  items: InsightsContextItem[];
};

export function PageSpeedInsightsCopyButtons({ items }: PageSpeedInsightsCopyButtonsProps) {
  return (
    <div className="flex flex-row justify-end gap-4">
      {items.map((item) => (
        <CopyButton key={item.label} size="lg" text={JSON.stringify(item.item) || ""}>
          {item.label}
        </CopyButton>
      ))}
    </div>
  );
}
