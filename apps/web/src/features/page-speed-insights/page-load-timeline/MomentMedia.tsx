"use client";

/* eslint-disable @next/next/no-img-element */

import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  FULLSCREEN_DIALOG_CLASS,
  FullscreenImage,
  ZOOM_TRIGGER_CLASS,
} from "@/features/page-speed-insights/shared/ZoomableImage";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import { WaterfallBarTrack } from "@/features/page-speed-insights/waterfall/WaterfallBarTrack";
import { waterfallRowFromLcpSegments } from "@/features/page-speed-insights/waterfall/waterfallData";
import type { TimelineEvent } from "./types";

export function MomentScreenshot({ timing, data }: { timing: number; data: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={`shrink-0 overflow-hidden rounded-md border bg-background shadow-sm hover:scale-[1.02] ${ZOOM_TRIGGER_CLASS}`}
        >
          <img
            src={data}
            alt={`Page at ${formatMs(timing)}`}
            className="h-28 w-auto max-w-[7rem] object-cover sm:h-32 sm:max-w-[9rem]"
            loading="lazy"
            decoding="async"
          />
          <span className="block border-t px-1.5 py-0.5 text-center text-[10px] tabular-nums text-muted-foreground">
            {formatMs(timing)}
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className={FULLSCREEN_DIALOG_CLASS}>
        <DialogTitle className="pr-8 text-base sm:text-lg">
          Screenshot at {formatMs(timing)}
        </DialogTitle>
        <FullscreenImage src={data} alt={`Page at ${formatMs(timing)}`} />
      </DialogContent>
    </Dialog>
  );
}

export function LcpBreakdown({
  segments,
  axisEnd,
}: {
  segments: NonNullable<TimelineEvent["lcpSegments"]>;
  axisEnd: number;
}) {
  const row = waterfallRowFromLcpSegments(segments);
  if (!row) return null;
  const scale = axisEnd > 0 ? axisEnd : Math.max(row.networkEnd, 1);
  return (
    <div className="mt-2 space-y-1" data-testid="moment-lcp-breakdown">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        LCP breakdown
      </div>
      <WaterfallBarTrack row={row} minStart={0} maxEnd={scale} height={8} />
      <ul className="grid gap-0.5 text-[11px] text-muted-foreground sm:grid-cols-2">
        {segments.map((seg) => (
          <li key={seg.subpart}>
            {seg.label}:{" "}
            <span className="tabular-nums text-foreground">{formatMs(seg.durationMs)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
