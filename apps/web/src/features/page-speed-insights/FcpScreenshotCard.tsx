"use client";
/* eslint-disable @next/next/no-img-element */

import { CompareRunsCard } from "@/features/page-speed-insights/shared/CompareRunsCard";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import type { FcpScreenshot } from "@/features/page-speed-insights/fcpScreenshot";

function ScreenshotFigure({ shot, showLabel }: { shot: FcpScreenshot; showLabel: boolean }) {
  return (
    <figure className="min-w-0 space-y-1">
      {showLabel ? (
        <figcaption className="text-xs font-medium text-muted-foreground">{shot.label}</figcaption>
      ) : null}
      <img
        alt={`${shot.label} at First Contentful Paint, ${formatMs(shot.timing)}`}
        src={shot.data}
        loading="lazy"
        decoding="async"
        className="h-auto max-h-80 w-auto max-w-full rounded-md border"
      />
      <figcaption className="text-xs text-muted-foreground tabular-nums">
        {formatMs(shot.timing)}
      </figcaption>
    </figure>
  );
}

export function FcpScreenshotCard({ screenshots }: { screenshots: FcpScreenshot[] }) {
  return (
    <CompareRunsCard
      items={screenshots}
      testId="fcp-screenshot"
      title="Screenshot at FCP"
      singleClassName="flex flex-wrap gap-4"
      compareKey={(shot) => shot.label}
      singleKey={(shot) => shot.label}
      renderItem={(shot, showLabel) => <ScreenshotFigure shot={shot} showLabel={showLabel} />}
    />
  );
}
