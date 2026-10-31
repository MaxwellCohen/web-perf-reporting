"use client";
import { Accordion } from "@/components/ui/accordion";
import { patchDashboardSearch } from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import { peerMaxSavingsFor } from "@/features/page-speed-insights/dashboard-view/recommendations-story/recommendationsStoryModel";
import { useDashboardSearchState } from "@/features/page-speed-insights/dashboard-view/useDashboardSearch";
import type { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";
import { RecommendationItem } from "@/features/page-speed-insights/RecommendationsSection/RecommendationItem";
import type { Recommendation } from "@/features/page-speed-insights/RecommendationsSection/types";
import { cn } from "@/lib/cn";

function setExpanded(next: string[]) {
  patchDashboardSearch({ expanded: next.length ? next : null });
}

export function RecommendationGroup({
  title,
  recs,
  items,
  expandedItems,
  className,
}: {
  title: string;
  recs: Recommendation[];
  items: ReturnType<typeof usePageSpeedItems>;
  expandedItems: string[];
  className?: string;
}) {
  if (!recs.length) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </p>
      <Accordion
        type="multiple"
        value={expandedItems}
        onValueChange={setExpanded}
        className="divide-y overflow-hidden rounded-xl border bg-card"
      >
        {recs.map((rec) => (
          <RecommendationItem
            key={rec.id}
            rec={rec}
            items={items}
            peerMaxSavings={peerMaxSavingsFor(rec, recs)}
            plain
          />
        ))}
      </Accordion>
    </div>
  );
}

/** Filter state + derived lists shared by the recommendations views. */
export function useRecommendationFilters(
  recommendations: Recommendation[],
  quickWins: Recommendation[],
) {
  const { categories: selectedCategories, priorities: selectedPriorities, expanded: expandedItems } =
    useDashboardSearchState();
  const matches = (rec: Recommendation) =>
    (selectedCategories.length === 0 || selectedCategories.includes(rec.category)) &&
    (selectedPriorities.length === 0 || selectedPriorities.includes(rec.priority));
  const filtered = recommendations.filter(matches);
  const grouped: Record<string, Recommendation[]> = {};
  for (const rec of filtered) (grouped[rec.category] ??= []).push(rec);
  const quickWinIds = new Set(quickWins.map((rec) => rec.id));

  return {
    selectedCategories,
    selectedPriorities,
    expandedItems,
    categories: Array.from(new Set(recommendations.map((r) => r.category))).sort(),
    priorities: Array.from(new Set(recommendations.map((r) => r.priority))).sort(),
    filtered,
    filteredQuickWins: quickWins.filter(matches),
    groups: Object.entries(grouped).map(([category, recs]) => ({
      category,
      recs: recs.filter((rec) => !quickWinIds.has(rec.id)),
    })),
    toggleAll: () =>
      setExpanded(
        expandedItems.length === filtered.length ? [] : filtered.map((rec) => rec.id),
      ),
    onCategoriesChange: (next: string[]) =>
      patchDashboardSearch({ categories: next.length ? next : null }),
    onPrioritiesChange: (next: string[]) =>
      patchDashboardSearch({ priorities: next.length ? next : null }),
  };
}
