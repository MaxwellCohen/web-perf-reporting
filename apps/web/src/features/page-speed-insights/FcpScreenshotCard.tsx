/* eslint-disable @next/next/no-img-element */

import { CompareRunsCard } from "@/features/page-speed-insights/shared/CompareRunsCard";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import type { FcpScreenshot } from "@/features/page-speed-insights/fcpScreenshot";

/** A frame this close to FCP is treated as the frame at FCP. */
const NEAR_FCP_MS = 100;

/** Says how far the frame is from FCP, since the filmstrip only has a few frames. */
function frameNote({ timing, fcpMs }: FcpScreenshot): string | null {
  const gap = timing - fcpMs;
  if (gap > NEAR_FCP_MS) {
    return `The filmstrip has no frame at FCP. This is the next one, ${formatMs(gap)} later.`;
  }
  if (gap < -NEAR_FCP_MS) {
    return `The filmstrip ends before FCP. This is its last frame, ${formatMs(-gap)} earlier.`;
  }
  return null;
}

function ScreenshotFigure({ shot, showLabel }: { shot: FcpScreenshot; showLabel: boolean }) {
  const note = frameNote(shot);

  return (
    <figure className="flex min-w-0 items-start gap-4 rounded-lg border bg-muted/40 p-3">
      <img
        alt={`${shot.label} at First Contentful Paint, ${formatMs(shot.timing)}`}
        src={shot.data}
        loading="lazy"
        decoding="async"
        className="h-auto w-[45%] shrink-0 rounded-md border sm:h-56 sm:w-auto sm:max-w-[55%]"
      />
      <figcaption className="flex min-w-0 flex-col gap-3">
        {showLabel ? <span className="text-sm font-semibold">{shot.label}</span> : null}
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="text-xs text-muted-foreground">First Contentful Paint</dt>
            <dd className="font-mono text-lg font-semibold tabular-nums">{formatMs(shot.fcpMs)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Frame captured at</dt>
            <dd className="font-mono text-sm tabular-nums">{formatMs(shot.timing)}</dd>
          </div>
        </dl>
        {note ? <p className="text-xs text-pretty text-muted-foreground">{note}</p> : null}
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
      singleClassName="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-4"
      compareKey={(shot) => shot.label}
      singleKey={(shot) => shot.label}
      renderItem={(shot, showLabel) => <ScreenshotFigure shot={shot} showLabel={showLabel} />}
    />
  );
}
