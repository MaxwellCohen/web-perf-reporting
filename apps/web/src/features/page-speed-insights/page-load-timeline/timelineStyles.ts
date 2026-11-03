import type { Rating } from "./types";

export function ratingClass(rating?: Rating): string {
  if (rating === "good") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (rating === "needs-improvement") return "bg-amber-500/15 text-amber-800 dark:text-amber-300";
  if (rating === "poor") return "bg-rose-500/15 text-rose-700 dark:text-rose-300";
  return "bg-muted text-muted-foreground";
}
