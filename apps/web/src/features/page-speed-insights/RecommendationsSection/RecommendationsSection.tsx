"use client";
import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";
import { AccordionItem, AccordionContent } from "@/components/ui/accordion";
import { AccordionSectionTitleTrigger } from "@/components/ui/accordion-section-title-trigger";
import { Badge } from "@/components/ui/badge";
import {
  analyzeAudits,
  hasDetails,
} from "@/features/page-speed-insights/RecommendationsSection/analyzeAudits";
import {
  RecommendationGroup,
  useRecommendationFilters,
} from "@/features/page-speed-insights/RecommendationsSection/RecommendationGroup";
import { FilterControls } from "@/features/page-speed-insights/RecommendationsSection/FilterControls";
import {
  getQuickWinRecommendations,
  RecommendationsSummary,
} from "@/features/page-speed-insights/RecommendationsSection/RecommendationsSummary";

export function RecommendationsSection() {
  const items = usePageSpeedItems();
  const allRecommendations = analyzeAudits(items);

  const recommendations = allRecommendations.filter(hasDetails);

  const quickWins = getQuickWinRecommendations(recommendations);
  const f = useRecommendationFilters(recommendations, quickWins);

  if (recommendations.length === 0) {
    return null;
  }

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
            categories={f.categories}
            priorities={f.priorities}
            selectedCategories={f.selectedCategories}
            selectedPriorities={f.selectedPriorities}
            onCategoriesChange={f.onCategoriesChange}
            onPrioritiesChange={f.onPrioritiesChange}
            filteredCount={f.filtered.length}
            totalCount={recommendations.length}
            onToggleAll={f.toggleAll}
            expandedCount={f.expandedItems.length}
            totalFiltered={f.filtered.length}
          />
          <RecommendationGroup
            title="Quick Wins"
            recs={f.filteredQuickWins}
            items={items}
            expandedItems={f.expandedItems}
            className="mb-6"
          />
          {f.groups.map(({ category, recs }) => (
            <RecommendationGroup
              key={category}
              title={category}
              recs={recs}
              items={items}
              expandedItems={f.expandedItems}
              className="mb-6"
            />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
