"use client";

import { useMemo } from "react";
import { Accordion } from "@/components/ui/accordion";
import { patchDashboardSearch } from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import {
  recommendationsStoryFrom,
  type LargestSaving,
  type PriorityCount,
} from "@/features/page-speed-insights/dashboard-view/recommendations-story/recommendationsStoryModel";
import { useDashboardSearchState } from "@/features/page-speed-insights/dashboard-view/useDashboardSearch";
import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";
import {
  analyzeAudits,
  hasDetails,
} from "@/features/page-speed-insights/RecommendationsSection/analyzeAudits";
import { FilterControls } from "@/features/page-speed-insights/RecommendationsSection/FilterControls";
import { RecommendationItem } from "@/features/page-speed-insights/RecommendationsSection/RecommendationItem";
import { getQuickWinRecommendations } from "@/features/page-speed-insights/RecommendationsSection/RecommendationsSummary";
import type { Recommendation } from "@/features/page-speed-insights/RecommendationsSection/types";
import { formatBytes, formatMs } from "@/features/page-speed-insights/shared/format";
import { cn } from "@/lib/cn";

const priorityColors = {
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

const PRIORITY_LABEL: Record<Recommendation["priority"], string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

function savingsCaption(milliseconds: number, bytes: number): string | null {
  const parts = [
    milliseconds > 0 ? formatMs(milliseconds) : null,
    bytes > 0 ? formatBytes(bytes) : null,
  ].filter((part): part is string => part != null);
  if (parts.length === 0) return null;
  if (parts.length === 1) return `Potential savings of ${parts[0]}.`;
  return `Potential savings of ${parts[0]} and ${parts[1]}.`;
}

function formatRecommendationSavings(savings: number, unit: string): string {
  const normalized = unit.toLowerCase();
  if (normalized.includes("ms") || normalized.includes("millisecond")) return formatMs(savings);
  if (normalized.includes("byte")) return formatBytes(savings);
  return unit ? `${savings} ${unit}` : String(savings);
}

function railClass(count: number): string {
  return cn("grid gap-2", count > 1 && "sm:grid-cols-2", count > 2 && "lg:grid-cols-3");
}

function PriorityRail({
  counts,
  selectedPriorities,
  caption,
}: {
  counts: PriorityCount[];
  selectedPriorities: string[];
  caption: string | null;
}) {
  return (
    <div className="space-y-3">
      <div className={railClass(counts.length)} role="group" aria-label="Choose a priority">
        {counts.map((item) => {
          const pressed =
            selectedPriorities.length === 1 && selectedPriorities[0] === item.priority;
          return (
            <button
              key={item.priority}
              type="button"
              aria-pressed={pressed}
              onClick={() =>
                patchDashboardSearch({ priorities: pressed ? null : [item.priority] })
              }
              className={cn(
                "flex min-w-0 flex-col gap-1.5 rounded-xl border px-3 py-3 text-left transition",
                pressed
                  ? "border-foreground/40 bg-muted/70"
                  : "border-border bg-background/40 hover:bg-muted/40",
              )}
            >
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {PRIORITY_LABEL[item.priority]} priority
              </span>
              <span className="text-2xl font-semibold tabular-nums">{item.count}</span>
            </button>
          );
        })}
      </div>
      {caption ? <p className="text-sm text-muted-foreground">{caption}</p> : null}
    </div>
  );
}

function LargestSavingsRail({
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
    <div className={railClass(items.length)} role="group" aria-label="Largest savings">
      {items.map((item) => {
        const pressed = soleExpanded === item.id;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={pressed}
            onClick={() => onSelect(item)}
            className={cn(
              "flex min-w-0 flex-col gap-1.5 rounded-xl border px-3 py-3 text-left transition",
              pressed
                ? "border-foreground/40 bg-muted/70"
                : "border-border bg-background/40 hover:bg-muted/40",
            )}
          >
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {PRIORITY_LABEL[item.priority]}
            </span>
            <span className="text-2xl font-semibold tabular-nums">
              {formatRecommendationSavings(item.savings, item.unit)}
            </span>
            <span className="line-clamp-2 text-sm">{item.title}</span>
          </button>
        );
      })}
    </div>
  );
}

function RecommendationGroup({
  title,
  recs,
  items,
  expandedItems,
  onExpandedChange,
}: {
  title: string;
  recs: Recommendation[];
  items: ReturnType<typeof usePageSpeedItems>;
  expandedItems: string[];
  onExpandedChange: (value: string[]) => void;
}) {
  if (!recs.length) return null;

  return (
    <div className="mb-6">
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
      <Accordion
        type="multiple"
        value={expandedItems}
        onValueChange={onExpandedChange}
        className="space-y-2"
      >
        {recs.map((rec) => (
          <RecommendationItem
            key={rec.id}
            rec={rec}
            items={items}
            priorityColors={priorityColors}
          />
        ))}
      </Accordion>
    </div>
  );
}

export function RecommendationsStory() {
  const items = usePageSpeedItems();
  const {
    categories: selectedCategories,
    priorities: selectedPriorities,
    expanded: expandedItems,
  } = useDashboardSearchState();
  const { recommendations, story } = useMemo(() => {
    const nextRecommendations = analyzeAudits(items).filter(hasDetails);
    return {
      recommendations: nextRecommendations,
      story: recommendationsStoryFrom(nextRecommendations),
    };
  }, [items]);

  if (!story) {
    return (
      <p className="text-sm text-muted-foreground">This report has no recommendations.</p>
    );
  }

  const quickWins = getQuickWinRecommendations(recommendations);
  const categories = Array.from(new Set(recommendations.map((rec) => rec.category))).sort();
  const priorities = Array.from(new Set(recommendations.map((rec) => rec.priority))).sort();
  const filteredRecommendations = recommendations.filter((rec) => {
    const categoryMatch =
      selectedCategories.length === 0 || selectedCategories.includes(rec.category);
    const priorityMatch =
      selectedPriorities.length === 0 || selectedPriorities.includes(rec.priority);
    return categoryMatch && priorityMatch;
  });
  const grouped: Record<string, Recommendation[]> = {};
  filteredRecommendations.forEach((rec) => {
    if (!grouped[rec.category]) grouped[rec.category] = [];
    grouped[rec.category].push(rec);
  });
  const quickWinIds = new Set(quickWins.map((rec) => rec.id));

  function setExpanded(next: string[]) {
    patchDashboardSearch({ expanded: next.length ? next : null });
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
    patchDashboardSearch({
      expanded: [saving.id],
      ...(hiddenByPriority ? { priorities: null } : {}),
      ...(hiddenByCategory ? { categories: null } : {}),
    });
  }

  function toggleAll() {
    const next =
      expandedItems.length === filteredRecommendations.length
        ? []
        : filteredRecommendations.map((recommendation) => recommendation.id);
    patchDashboardSearch({ expanded: next.length ? next : null });
  }

  const filteredQuickWins = quickWins.filter(
    (rec) =>
      (selectedCategories.length === 0 || selectedCategories.includes(rec.category)) &&
      (selectedPriorities.length === 0 || selectedPriorities.includes(rec.priority)),
  );

  return (
    <section aria-label="Recommendations" className="overflow-hidden rounded-xl border bg-card">
      <div className="space-y-5 p-4 sm:p-6">
        <PriorityRail
          counts={story.counts}
          selectedPriorities={selectedPriorities}
          caption={savingsCaption(story.milliseconds, story.bytes)}
        />
        <LargestSavingsRail items={story.largest} expanded={expandedItems} onSelect={openLargest} />
      </div>
      <div className="border-t p-4 sm:p-6">
        <FilterControls
          categories={categories}
          priorities={priorities}
          selectedCategories={selectedCategories}
          selectedPriorities={selectedPriorities}
          onCategoriesChange={(next) =>
            patchDashboardSearch({ categories: next.length ? next : null })
          }
          onPrioritiesChange={(next) =>
            patchDashboardSearch({ priorities: next.length ? next : null })
          }
          filteredCount={filteredRecommendations.length}
          totalCount={recommendations.length}
          onToggleAll={toggleAll}
          expandedCount={expandedItems.length}
          totalFiltered={filteredRecommendations.length}
        />
        <RecommendationGroup
          title="Quick Wins"
          recs={filteredQuickWins}
          items={items}
          expandedItems={expandedItems}
          onExpandedChange={setExpanded}
        />
        {Object.entries(grouped).map(([category, recs]) => (
          <RecommendationGroup
            key={category}
            title={category}
            recs={recs.filter((rec) => !quickWinIds.has(rec.id))}
            items={items}
            expandedItems={expandedItems}
            onExpandedChange={setExpanded}
          />
        ))}
      </div>
    </section>
  );
}
