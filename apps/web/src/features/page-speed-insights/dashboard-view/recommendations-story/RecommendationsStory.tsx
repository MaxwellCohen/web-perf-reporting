"use client";

import { useMemo } from "react";
import { Accordion } from "@/components/ui/accordion";
import { patchDashboardSearch } from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import {
  formatRecommendationSavings,
  peerMaxSavingsFor,
  recommendationsStoryFrom,
  type LargestSaving,
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
    <div className="space-y-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </p>
      <Accordion
        type="multiple"
        value={expandedItems}
        onValueChange={onExpandedChange}
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
    const turningOff = expandedItems.length === 1 && expandedItems[0] === saving.id;
    patchDashboardSearch({
      expanded: turningOff ? null : [saving.id],
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
            title="Quick wins"
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
    </FullWidthTables>
  );
}
