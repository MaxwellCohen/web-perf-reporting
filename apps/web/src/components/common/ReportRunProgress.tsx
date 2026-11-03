"use client";
import { useSyncExternalStore } from "react";
import { LoadingMessage } from "@/components/common/LoadingMessage";
import {
  getPageSpeedProgress,
  pollProgressFraction,
  subscribePageSpeedProgress,
} from "@/lib/page-speed-insights/pageSpeedInsightsClient";

const STATE_LABEL = {
  queued: "Queued",
  running: "Running",
} as const;

const getServerProgress = () => undefined;

/** Suspense fallback for a saved report: worker job state + progress bar above the loader. */
export function ReportRunProgress({ publicId }: { publicId: string }) {
  const progress = useSyncExternalStore(
    subscribePageSpeedProgress,
    () => getPageSpeedProgress(publicId),
    getServerProgress,
  );
  const percent = Math.round(pollProgressFraction(progress?.polls ?? 0) * 100);
  const label = progress ? STATE_LABEL[progress.state] : "Starting";

  return (
    <div>
      <div className="mx-auto w-full max-w-lg px-4 pt-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium" data-testid="run-state">
            {label}
          </span>
          {progress?.url ? (
            <span className="text-muted-foreground ml-4 truncate">{progress.url}</span>
          ) : null}
        </div>
        <div
          role="progressbar"
          aria-label="Report run progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="bg-muted h-2 w-full overflow-hidden rounded-full"
        >
          <div
            className="bg-foreground h-full transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <LoadingMessage />
    </div>
  );
}
