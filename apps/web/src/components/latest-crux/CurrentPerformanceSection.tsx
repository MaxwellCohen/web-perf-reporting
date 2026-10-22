"use client";

import { LoadingMessage } from "@/components/common/LoadingMessage";
import { CurrentPerformanceDashboard } from "@/components/latest-crux/PerformanceDashboard";
import type { CruxReportMap } from "@/components/latest-crux/types";
import { useCruxJob } from "@/lib/crux/useCruxJob";
import type { CruxReport } from "@/lib/schema";

function reportFromSlots(
  slots: { key: string; report?: unknown }[],
): CruxReportMap {
  const map = {} as CruxReportMap;
  for (const slot of slots) {
    map[slot.key as keyof CruxReportMap] = (slot.report ?? null) as CruxReport | null;
  }
  return map;
}

export function CurrentPerformanceSection({ url }: { url: string }) {
  const { snapshot, error } = useCruxJob("current", url);

  if (error) {
    return <p className="text-destructive mt-4 text-center">{error}</p>;
  }

  const pending = snapshot?.slots.filter((slot) => slot.status === "pending") ?? [];
  const hasReadySlot = snapshot?.slots.some((slot) => slot.status === "ready") ?? false;
  if (!snapshot || !hasReadySlot) {
    return <LoadingMessage variant="crux" />;
  }

  return (
    <div className="mt-4 flex flex-col">
      <CurrentPerformanceDashboard
        reportMap={reportFromSlots(snapshot.slots)}
        pendingKeys={pending.map((slot) => slot.key)}
      />
    </div>
  );
}
