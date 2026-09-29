"use client";
/* eslint-disable @next/next/no-img-element */

import { TableCardShell } from "@/features/page-speed-insights/shared/TableCard";
import type { FcpScreenshot } from "@/features/page-speed-insights/fcpScreenshot";

function formatMs(value: number): string {
  return `${Math.round(value)} ms`;
}

export function FcpScreenshotCard({ screenshots }: { screenshots: FcpScreenshot[] }) {
  if (!screenshots.length) return null;

  return (
    <div data-testid="fcp-screenshot" className="md:col-span-2 lg:col-span-3">
      <TableCardShell title="Screenshot at FCP">
        <div className="flex flex-wrap gap-4">
          {screenshots.map((shot) => (
            <figure key={shot.label} className="min-w-0 space-y-1">
              {screenshots.length > 1 ? (
                <figcaption className="text-xs font-medium text-muted-foreground">
                  {shot.label}
                </figcaption>
              ) : null}
              <img
                alt={`${shot.label} at First Contentful Paint, ${formatMs(shot.timing)}`}
                src={shot.data}
                className="h-auto max-h-80 w-auto max-w-full rounded-md border"
              />
              <figcaption className="text-xs text-muted-foreground tabular-nums">
                {formatMs(shot.timing)}
              </figcaption>
            </figure>
          ))}
        </div>
      </TableCardShell>
    </div>
  );
}
