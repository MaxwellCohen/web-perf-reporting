export const RESOURCE_TYPE_COLORS: Record<string, string> = {
  Document: "bg-amber-500/90 dark:bg-amber-500/80",
  Script: "bg-amber-400/90 dark:bg-amber-400/80",
  Stylesheet: "bg-violet-500/90 dark:bg-violet-400/80",
  Font: "bg-emerald-600/90 dark:bg-emerald-500/80",
  Image: "bg-sky-500/90 dark:bg-sky-400/80",
  Media: "bg-rose-500/90 dark:bg-rose-400/80",
  XHR: "bg-teal-500/90 dark:bg-teal-400/80",
  Fetch: "bg-teal-500/90 dark:bg-teal-400/80",
  Other: "bg-slate-500/80 dark:bg-slate-400/70",
};

export const QUEUE_SEGMENT_COLOR =
  "bg-slate-400/60 dark:bg-slate-500/50 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(0,0,0,0.06)_2px,rgba(0,0,0,0.06)_4px)] dark:bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(255,255,255,0.08)_2px,rgba(255,255,255,0.08)_4px)]";

export function getNetworkBarColor(resourceType?: string): string {
  if (!resourceType) return RESOURCE_TYPE_COLORS.Other ?? "bg-slate-500/80";
  return RESOURCE_TYPE_COLORS[resourceType] ?? RESOURCE_TYPE_COLORS.Other;
}
