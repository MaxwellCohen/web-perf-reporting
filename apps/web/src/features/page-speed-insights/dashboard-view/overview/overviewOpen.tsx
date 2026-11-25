"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { patchDashboardSearch } from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import { writeOpenSections } from "@/features/page-speed-insights/dashboard-view/SectionStack";
import { useDashboardSearchState } from "@/features/page-speed-insights/dashboard-view/useDashboardSearch";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";

type OverviewOpen = {
  isOpen: (key: string) => boolean;
  setOpen: (key: string, open: boolean) => void;
  /** Replace the whole open set, e.g. expand all or collapse all. */
  setAll: (keys: string[]) => void;
  /** Open `keys`, then scroll to and highlight the element with `elementId`. */
  reveal: (keys: string[], elementId: string) => void;
  /** DOM id of the element last revealed. */
  highlighted: string | null;
};

const OverviewOpenContext = createContext<OverviewOpen | null>(null);

/** How long a newly opened section takes to load its lazy content and settle its height. */
const SETTLE_MS = 400;

function scrollToElement(elementId: string) {
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const scroll = () =>
    document
      .getElementById(elementId)
      ?.scrollIntoView?.({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  // Two frames: the opened sections have to render before there is anything to scroll to.
  requestAnimationFrame(() => requestAnimationFrame(scroll));
  // Sections opened above the target grow as they load, so aim again once they settle.
  window.setTimeout(scroll, SETTLE_MS);
}

/** Open state for the Overview's sections and cause cards, shared through the `open` query param. */
export function OverviewOpenProvider({
  defaultOpen,
  children,
}: {
  defaultOpen: string[];
  children: ReactNode;
}) {
  const stored = useDashboardSearchState().open;
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const open = stored ?? defaultOpen;

  const value = useMemo<OverviewOpen>(() => {
    const current = new Set(open);
    return {
      isOpen: (key) => current.has(key),
      setOpen: (key, next) => {
        if (current.has(key) === next) return;
        writeOpenSections(
          next ? [...open, key] : open.filter((value) => value !== key),
          defaultOpen,
        );
      },
      setAll: (keys) => writeOpenSections(keys, defaultOpen),
      reveal: (keys, elementId) => {
        writeOpenSections([...new Set([...open, ...keys])], defaultOpen);
        setHighlighted(elementId);
        scrollToElement(elementId);
      },
      highlighted,
    };
  }, [open, defaultOpen, highlighted]);

  return <OverviewOpenContext.Provider value={value}>{children}</OverviewOpenContext.Provider>;
}

/** Null outside the Overview tab, where cause cards manage their own open state. */
export function useOverviewOpen(): OverviewOpen | null {
  return useContext(OverviewOpenContext);
}

/** The report the timeline and "Fix these first" describe; shared with the other tabs' `report`. */
export function useFocusReport(items: InsightsContextItem[]) {
  const report = useDashboardSearchState().report;
  const focus = items.find((item) => item.label === report[0]) ?? items[0];
  const setFocus = useCallback((label: string) => patchDashboardSearch({ report: [label] }), []);
  return { focus, setFocus };
}

const NARROW_QUERY = "(max-width: 639px)";

function subscribeNarrow(onChange: () => void) {
  const query = window.matchMedia?.(NARROW_QUERY);
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
}

/** True on phone-width viewports. False while server rendering. */
export function useIsNarrow(): boolean {
  return useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia?.(NARROW_QUERY).matches ?? false,
    () => false,
  );
}
