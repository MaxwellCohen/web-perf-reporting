"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  isDashboardViewMode,
  patchDashboardSearch,
  type DashboardViewMode,
} from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import { useDashboardSearchState } from "@/features/page-speed-insights/dashboard-view/useDashboardSearch";

export { isDashboardViewMode,  };

const STORAGE_KEY = "page-speed-insights:view-mode";
const DEFAULT_VIEW_MODE: DashboardViewMode = "dashboard";

const listeners = new Set<() => void>();
let inMemoryViewMode: DashboardViewMode = DEFAULT_VIEW_MODE;

function readViewMode(): DashboardViewMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isDashboardViewMode(stored) ? stored : inMemoryViewMode;
  } catch {
    return inMemoryViewMode;
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function setStoredViewMode(mode: DashboardViewMode) {
  inMemoryViewMode = mode;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // localStorage can throw in private mode or sandboxed iframes.
  }
  listeners.forEach((listener) => listener());
}

function selectViewMode(mode: DashboardViewMode) {
  setStoredViewMode(mode);
  patchDashboardSearch({ view: mode, open: null }, "push");
}

export function useDashboardViewMode() {
  const { view: urlView, tab } = useDashboardSearchState();
  const stored = useSyncExternalStore(subscribe, readViewMode, () => DEFAULT_VIEW_MODE);
  const mode = urlView ?? (tab === "overview" ? stored : "dashboard");

  useEffect(() => {
    if (urlView) return;
    patchDashboardSearch({ view: mode }, "replace");
  }, [urlView, mode]);

  return [mode, selectViewMode] as const;
}
