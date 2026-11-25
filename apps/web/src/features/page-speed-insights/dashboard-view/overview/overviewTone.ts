import type { Rating } from "@/features/page-speed-insights/page-load-timeline/types";

/** Text colour for a Lighthouse audit score (0..1). */
export function scoreTextClass(score: number | null | undefined): string {
  if (typeof score !== "number") return "text-foreground";
  if (score >= 0.9) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 0.5) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

/** Fill for a metric marker; pair it with dark text. */
export function ratingFillClass(rating: Rating | undefined): string {
  if (rating === "good") return "bg-emerald-500";
  if (rating === "needs-improvement") return "bg-amber-500";
  if (rating === "poor") return "bg-rose-500";
  return "bg-neutral-300";
}
