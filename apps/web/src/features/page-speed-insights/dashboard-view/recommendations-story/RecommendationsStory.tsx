"use client";

import { useMemo } from "react";
import { patchDashboardSearch } from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import {
  formatRecommendationSavings,
  recommendationsStoryFrom,
  type LargestSaving,
} from "@/features/page-speed-insights/dashboard-view/recommendations-story/recommendationsStoryModel";
import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";
import {
  analyzeAudits,
  hasDetails,
} from "@/features/page-speed-insights/RecommendationsSection/analyzeAudits";
import { FilterControls } from "@/features/page-speed-insights/RecommendationsSection/FilterControls";
import {
  RecommendationGroup,
  useRecommendationFilters,
} from "@/features/page-speed-insights/RecommendationsSection/RecommendationGroup";
import { getQuickWinRecommendations } from "@/features/page-speed-insights/RecommendationsSection/RecommendationsSummary";
import type { Recommendation } from "@/features/page-speed-insights/RecommendationsSection/types";
import { FullWidthTables } from "@/features/page-speed-insights/tanstack-table-v9/fullWidthTables";
import { cn } from "@/lib/cn";

const PRIORITY_LABEL: Record<Recommendation["priority"], string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

function FixNextList({
  items,
  expanded,
  onSelect,
}: {
  items: LargestSaving[];
  expanded: string[];
  onSelect: (saving: LargestSaving) => void;
}) {
  if (items.length === 0) return null;
  const soleExpanded = expanded.length === 1 ? expanded[0] : undefined;

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Fix next
      </p>
      <ol aria-label="Fix next" className="space-y-2">
        {items.map((item, index) => {
          const selected = soleExpanded === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(item)}
                className={cn(
                  "flex w-full gap-3 rounded-lg border px-3 py-2.5 text-left transition",
                  selected
                    ? "border-foreground/50 bg-muted/70"
                    : "border-border bg-background/40 hover:bg-muted/40",
                )}
              >
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 space-y-1">
                  <span className="block truncate text-sm font-medium">{item.title}</span>
                  <span className="block font-mono text-xs tabular-nums text-muted-foreground">
                    {formatRecommendationSavings(item.savings, item.unit)}
                    {item.metric ? ` · ${item.metric}` : ""}
                  </span>
                  <span className="block text-xs font-medium text-foreground">
                    {PRIORITY_LABEL[item.priority]} priority
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function RecommendationsStory() {
  const items = usePageSpeedItems();
  const { recommendations, story } = useMemo(() => {
    const nextRecommendations = analyzeAudits(items).filter(hasDetails);
    return {
      recommendations: nextRecommendations,
      story: recommendationsStoryFrom(nextRecommendations),
    };
  }, [items]);

  const quickWins = getQuickWinRecommendations(recommendations);
  const f = useRecommendationFilters(recommendations, quickWins);
  const { selectedCategories, selectedPriorities, expandedItems } = f;

  if (!story) {
    return <p className="text-sm text-muted-foreground">This report has no recommendations.</p>;
  }

  function openLargest(saving: LargestSaving) {
    const recommendation = recommendations.find((item) => item.id === saving.id);
    const hiddenByPriority =
      recommendation != null &&
      selectedPriorities.length > 0 &&
      !selectedPriorities.includes(recommendation.priority);
    const hiddenByCategory =
      recommendation != null &&
      selectedCategories.length > 0 &&
      !selectedCategories.includes(recommendation.category);
    const turningOff = expandedItems.length === 1 && expandedItems[0] === saving.id;
    patchDashboardSearch({
      expanded: turningOff ? null : [saving.id],
      ...(hiddenByPriority ? { priorities: null } : {}),
      ...(hiddenByCategory ? { categories: null } : {}),
    });
  }

  return (
    <FullWidthTables>
      <section aria-label="Recommendations" className="overflow-hidden rounded-xl border bg-card">
        <div className="space-y-6 p-4 sm:p-6">
          <header className="max-w-3xl animate-in fade-in slide-in-from-bottom-1 duration-500">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              What to fix
            </p>
            <p className="mt-2 font-mono text-4xl font-semibold tabular-nums tracking-tight">
              {story.lead.magnitude}
            </p>
            <p className="mt-2 text-lg leading-snug">{story.lead.sentence}</p>
          </header>
          <FixNextList items={story.largest} expanded={expandedItems} onSelect={openLargest} />
        </div>
        <div className="space-y-6 border-t p-4 sm:p-6">
          <FilterControls
            categories={f.categories}
            priorities={f.priorities}
            selectedCategories={selectedCategories}
            selectedPriorities={selectedPriorities}
            onCategoriesChange={f.onCategoriesChange}
            onPrioritiesChange={f.onPrioritiesChange}
            filteredCount={f.filtered.length}
            totalCount={recommendations.length}
            onToggleAll={f.toggleAll}
            expandedCount={expandedItems.length}
            totalFiltered={f.filtered.length}
          />
          <RecommendationGroup
            title="Quick wins"
            recs={f.filteredQuickWins}
            items={items}
            expandedItems={expandedItems}
          />
          {f.groups.map(({ category, recs }) => (
            <RecommendationGroup
              key={category}
              title={category}
              recs={recs}
              items={items}
              expandedItems={expandedItems}
            />
          ))}
        </div>
      </section>
    </FullWidthTables>
  );
}
