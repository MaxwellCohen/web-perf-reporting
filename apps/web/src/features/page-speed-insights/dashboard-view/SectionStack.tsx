"use client";

import type { ReactNode } from "react";
import { Accordion } from "@/components/ui/accordion";
import { patchDashboardSearch } from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import { useDashboardSearchState } from "@/features/page-speed-insights/dashboard-view/useDashboardSearch";

function sameMembers(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const values = new Set(left);
  return right.every((value) => values.has(value));
}

export function SectionStack({
  defaultOpen,
  children,
}: {
  defaultOpen: string[];
  children: ReactNode;
}) {
  const open = useDashboardSearchState().open;
  const value = open ?? defaultOpen;

  return (
    <Accordion
      type="multiple"
      value={value}
      onValueChange={(next) => {
        patchDashboardSearch({ open: sameMembers(next, defaultOpen) ? null : next });
      }}
    >
      {children}
    </Accordion>
  );
}
