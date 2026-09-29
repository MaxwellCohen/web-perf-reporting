"use client";

import type { CauseAuditEntry } from "@/features/page-speed-insights/metricCauseAudits";
import { formatBytes } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { ResourceUrlCell } from "@/features/page-speed-insights/shared/ResourceUrlCell";
import {
  imageSizeLines,
  summarizeImageDelivery,
  type ImageDeliveryImage,
  type ImageDeliveryOptimization,
} from "@/features/page-speed-insights/imageDeliverySummary";

function SavingsBar({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? Math.max(8, Math.round((value / max) * 100)) : 0;

  return (
    <div className="h-1.5 w-full self-center overflow-hidden rounded-full bg-muted" aria-hidden>
      <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
    </div>
  );
}

function OptimizationRow({
  optimization,
  maxSavings,
}: {
  optimization: ImageDeliveryOptimization;
  maxSavings: number;
}) {
  const sizes = optimization.id === "responsive-size" ? imageSizeLines(optimization.reports) : [];

  return (
    <li className="grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1">
      <SavingsBar value={optimization.wastedBytes} max={maxSavings} />
      <p className="text-sm">{optimization.title}</p>
      <p className="font-mono text-sm tabular-nums">{formatBytes(optimization.wastedBytes)}</p>
      {sizes.length ? (
        <p className="col-start-2 text-xs text-muted-foreground">{sizes.join(" · ")}</p>
      ) : null}
    </li>
  );
}

function ImageRow({ image }: { image: ImageDeliveryImage }) {
  const maxSavings = Math.max(...image.optimizations.map((optimization) => optimization.wastedBytes));

  return (
    <li className="space-y-3 px-3 py-3">
      <div className="flex items-start justify-between gap-4">
        <ResourceUrlCell url={image.url} />
        <p className="shrink-0 text-right text-xs text-muted-foreground">
          {formatBytes(image.totalBytes)} downloaded
        </p>
      </div>
      <ul className="space-y-2">
        {image.optimizations.map((optimization) => (
          <OptimizationRow
            key={optimization.id}
            optimization={optimization}
            maxSavings={maxSavings}
          />
        ))}
      </ul>
    </li>
  );
}

export function ImageDeliveryCause({ entries }: { entries: CauseAuditEntry["entries"] }) {
  const { images } = summarizeImageDelivery(entries);

  if (!images.length) {
    return (
      <p className="text-sm text-muted-foreground">No image delivery savings in this report.</p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Each image is listed once. When an image needs more than one change, those savings overlap
        and are not a combined total.
      </p>
      <ul className="divide-y overflow-hidden rounded-lg border">
        {images.map((image) => (
          <ImageRow key={image.url} image={image} />
        ))}
      </ul>
    </div>
  );
}
