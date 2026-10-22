"use client";

import { LoadingMessage } from "@/components/common/LoadingMessage";
import { HistoricalDashboard } from "@/components/historical/HistoricalDashboard";
import type { DeviceType, Scope } from "@/components/latest-crux/types";
import { useCruxJob } from "@/lib/crux/useCruxJob";
import type { CruxReport } from "@/lib/schema";

export function HistoricalChartsSection({ url }: { url: string }) {
  const { snapshot, error } = useCruxJob("history", url);

  if (error) {
    return <p className="text-destructive mt-4 text-center">{error}</p>;
  }

  const pending = snapshot?.slots.filter((slot) => slot.status === "pending") ?? [];
  const hasReadySlot = snapshot?.slots.some((slot) => slot.status === "ready") ?? false;
  if (!snapshot || !hasReadySlot) {
    return <LoadingMessage />;
  }

  const reportMap = {} as Record<`${Scope}${DeviceType}`, CruxReport[] | null>;
  for (const slot of snapshot.slots) {
    reportMap[slot.key as `${Scope}${DeviceType}`] = (slot.reports ?? null) as CruxReport[] | null;
  }

  return (
    <div className="mt-4 flex flex-col">
      <HistoricalDashboard reportMap={reportMap} pendingKeys={pending.map((slot) => slot.key)} />
    </div>
  );
}
