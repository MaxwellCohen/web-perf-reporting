"use client";
/* eslint-disable @next/next/no-img-element */

import { TableCardShell } from "@/features/page-speed-insights/shared/TableCard";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import type { FcpScreenshot } from "@/features/page-speed-insights/fcpScreenshot";
import {
  getCompareRuns,
  pairByFormFactor,
} from "@/features/page-speed-insights/shared/compareRuns";

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
  if (!screenshots.length) return null;

  const compare = getCompareRuns(screenshots);

  if (compare.mode === "compare") {
    const pairs = pairByFormFactor(screenshots, compare.runs);
    return (
      <div data-testid="fcp-screenshot" className="md:col-span-2 lg:col-span-3">
        <TableCardShell title="Screenshot at FCP">
          <div className="flex flex-col gap-4" data-testid="fcp-screenshot-compare">
            {pairs.map((pair) => {
              const shots = [pair.a, pair.b].filter(Boolean) as FcpScreenshot[];
              if (!shots.length) return null;
              return (
                <div key={pair.formFactor} className="min-w-0 space-y-2">
                  <p className="text-sm font-semibold">{pair.formFactor}</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {shots.map((shot) => (
                      <ScreenshotFigure key={shot.label} shot={shot} showLabel />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TableCardShell>
      </div>
    );
  }

  return (
    <div data-testid="fcp-screenshot" className="md:col-span-2 lg:col-span-3">
      <TableCardShell title="Screenshot at FCP">
        <div className="flex flex-wrap gap-4">
          {screenshots.map((shot) => (
            <ScreenshotFigure
              key={shot.label}
              shot={shot}
              showLabel={screenshots.length > 1}
            />
          ))}
        </div>
      </TableCardShell>
    </div>
  );
}
