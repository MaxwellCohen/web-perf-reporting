import type { WaterfallSignalId } from "@/features/page-speed-insights/waterfall/waterfallSignals";

export type WaterfallDebugPreset = {
  id: string;
  label: string;
  description: string;
  signals: WaterfallSignalId[];
};

/** One-click signal bundles for LCP/FCP and main-thread investigation. */
export const WATERFALL_DEBUG_PRESETS: WaterfallDebugPreset[] = [
  {
    id: "lcp",
    label: "Debug LCP",
    description: "Critical path, work between FCP and LCP, blocking scripts",
    signals: ["chain", "longest", "fcp-to-lcp", "long-task", "render-blocking"],
  },
  {
    id: "fcp",
    label: "Debug FCP",
    description: "Render-blocking and chain work before first paint",
    signals: ["render-blocking", "before-fcp", "chain"],
  },
  {
    id: "main-thread",
    label: "Main thread",
    description: "Long tasks and script CPU in the FCP→LCP window",
    signals: ["long-task", "script-cpu", "fcp-to-lcp"],
  },
];

export const WATERFALL_SIGNAL_GROUPS: {
  label: string;
  ids: readonly WaterfallSignalId[];
}[] = [
  {
    label: "Loading metrics",
    ids: [
      "render-blocking",
      "before-fcp",
      "before-lcp",
      "fcp-to-lcp",
      "chain",
      "longest",
      "long-task",
    ],
  },
  {
    label: "Network & scripts",
    ids: ["queue", "preload", "unused", "high-priority", "script-cpu"],
  },
  {
    label: "Main thread & timings",
    ids: ["short-task", "user-timing"],
  },
];
