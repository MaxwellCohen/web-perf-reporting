"use client";
import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";
import { patchDashboardSearch } from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import { useDashboardSearchState } from "@/features/page-speed-insights/dashboard-view/useDashboardSearch";
import { Accordion, AccordionItem, AccordionContent } from "@/components/ui/accordion";
import { AccordionSectionTitleTrigger } from "@/components/ui/accordion-section-title-trigger";
import { Badge } from "@/components/ui/badge";
import {
  analyzeAudits,
  hasDetails,
} from "@/features/page-speed-insights/RecommendationsSection/analyzeAudits";
import { peerMaxSavingsFor } from "@/features/page-speed-insights/dashboard-view/recommendations-story/recommendationsStoryModel";
import { FilterControls } from "@/features/page-speed-insights/RecommendationsSection/FilterControls";
import { RecommendationItem } from "@/features/page-speed-insights/RecommendationsSection/RecommendationItem";
import {
  getQuickWinRecommendations,
  RecommendationsSummary,
} from "@/features/page-speed-insights/RecommendationsSection/RecommendationsSummary";
import type { Recommendation } from "@/features/page-speed-insights/RecommendationsSection/types";

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
    <div className="mb-6 space-y-3">
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

export function RecommendationsSection() {
  const items = usePageSpeedItems();
  const allRecommendations = analyzeAudits(items);

  const recommendations = allRecommendations.filter(hasDetails);

  const quickWins = getQuickWinRecommendations(recommendations);
  const {
    categories: selectedCategories,
    priorities: selectedPriorities,
    expanded: expandedItems,
  } = useDashboardSearchState();

  const categories = Array.from(new Set(recommendations.map((r) => r.category))).sort();

  const priorities = Array.from(new Set(recommendations.map((r) => r.priority))).sort();

  const filteredRecommendations = recommendations.filter((rec) => {
    const categoryMatch =
      selectedCategories.length === 0 || selectedCategories.includes(rec.category);
    const priorityMatch =
      selectedPriorities.length === 0 || selectedPriorities.includes(rec.priority);
    return categoryMatch && priorityMatch;
  });

  const grouped: Record<string, Recommendation[]> = {};
  filteredRecommendations.forEach((rec) => {
    if (!grouped[rec.category]) {
      grouped[rec.category] = [];
    }
    grouped[rec.category].push(rec);
  });

  const toggleAll = () => {
    const next =
      expandedItems.length === filteredRecommendations.length
        ? []
        : filteredRecommendations.map((recommendation) => recommendation.id);
    patchDashboardSearch({ expanded: next.length ? next : null });
  };

  if (recommendations.length === 0) {
    return null;
  }

  const quickWinIds = new Set(quickWins.map((r) => r.id));

  return (
    <AccordionItem value="recommendations">
      <AccordionSectionTitleTrigger titleClassName="flex items-center gap-2">
        <span>Recommendations</span>
        <Badge variant="outline" className="no-underline hover:no-underline">
          {recommendations.length}
        </Badge>
      </AccordionSectionTitleTrigger>
      <AccordionContent>
        <div className="p-6">
          <RecommendationsSummary recommendations={recommendations} />
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
            recs={quickWins.filter(
              (rec) =>
                (selectedCategories.length === 0 || selectedCategories.includes(rec.category)) &&
                (selectedPriorities.length === 0 || selectedPriorities.includes(rec.priority)),
            )}
            items={items}
            expandedItems={expandedItems}
            onExpandedChange={(next) =>
              patchDashboardSearch({ expanded: next.length ? next : null })
            }
          />
          {Object.entries(grouped).map(([category, recs]) => (
            <RecommendationGroup
              key={category}
              title={category}
              recs={recs.filter((rec) => !quickWinIds.has(rec.id))}
              items={items}
              expandedItems={expandedItems}
              onExpandedChange={(next) =>
                patchDashboardSearch({ expanded: next.length ? next : null })
              }
            />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
