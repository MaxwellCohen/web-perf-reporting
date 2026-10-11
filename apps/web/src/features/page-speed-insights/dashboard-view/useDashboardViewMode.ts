"use client";

import { useSyncExternalStore } from "react";

export type DashboardViewMode = "dashboard" | "classic";

const STORAGE_KEY = "page-speed-insights:view-mode";
const DEFAULT_VIEW_MODE: DashboardViewMode = "dashboard";

const listeners = new Set<() => void>();
let inMemoryViewMode: DashboardViewMode = DEFAULT_VIEW_MODE;

export function isDashboardViewMode(value: unknown): value is DashboardViewMode {
  return value === "dashboard" || value === "classic";
}

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

function setViewMode(mode: DashboardViewMode) {
  inMemoryViewMode = mode;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // localStorage can throw in private mode or sandboxed iframes.
  }
  listeners.forEach((listener) => listener());
}

export function useDashboardViewMode() {
  const mode = useSyncExternalStore(subscribe, readViewMode, () => DEFAULT_VIEW_MODE);
  return [mode, setViewMode] as const;
}
