import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { openInLighthouseViewer } from "@/lib/viewer/openInLighthouseViewer";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";

type PageSpeedInsightsCopyButtonsProps = {
  items: InsightsContextItem[];
  /** When set, a Share control that copies this deep link sits in the same row. */
  shareUrl?: string;
};

export function PageSpeedInsightsCopyButtons({
  items,
  shareUrl,
}: PageSpeedInsightsCopyButtonsProps) {
  return (
    <div className="flex flex-wrap justify-end gap-2 sm:gap-4">
      {shareUrl ? (
        <CopyButton size="lg" className="min-w-0 max-w-full gap-2" text={shareUrl}>
          Share
        </CopyButton>
      ) : null}
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
      {items.map((item) =>
        item.item.lighthouseResult ? (
          <Button
            key={`lh-${item.label}`}
            type="button"
            variant="outline"
            size="lg"
            className="min-w-0 max-w-full"
            onClick={() => openInLighthouseViewer(item.item.lighthouseResult)}
          >
            <span className="truncate">Open {item.label} in Lighthouse Viewer</span>
          </Button>
        ) : null,
      )}
    </div>
  );
}
