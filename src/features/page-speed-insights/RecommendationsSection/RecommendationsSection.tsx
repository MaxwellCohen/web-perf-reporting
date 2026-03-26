'use client';
import { useMemo, useState } from 'react';
import { usePageSpeedItems } from '@/features/page-speed-insights/PageSpeedContext';
import {
  Accordion,
  AccordionItem,
  AccordionContent,
} from '@/components/ui/accordion';
import { AccordionSectionTitleTrigger } from '@/components/ui/accordion-section-title-trigger';
import { Badge } from '@/components/ui/badge';
import { analyzeAudits, hasDetails } from '@/features/page-speed-insights/RecommendationsSection/analyzeAudits';
import { FilterControls } from '@/features/page-speed-insights/RecommendationsSection/FilterControls';
import { RecommendationItem } from '@/features/page-speed-insights/RecommendationsSection/RecommendationItem';
import type { Recommendation } from '@/features/page-speed-insights/RecommendationsSection/types';



const priorityColors = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

export function RecommendationsSection() {
  const items = usePageSpeedItems();
  const allRecommendations = useMemo(() => analyzeAudits(items), [items]);
  
  const recommendations = useMemo(() => {
    return allRecommendations.filter(hasDetails);
  }, [allRecommendations]);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const categories = useMemo(() => {
    return Array.from(new Set(recommendations.map((r) => r.category))).sort();
  }, [recommendations]);

  const priorities = useMemo(() => {
    return Array.from(new Set(recommendations.map((r) => r.priority))).sort();
  }, [recommendations]);

  const filteredRecommendations = useMemo(() => {
    return recommendations.filter((rec) => {
      const categoryMatch =
        selectedCategories.length === 0 || selectedCategories.includes(rec.category);
      const priorityMatch =
        selectedPriorities.length === 0 || selectedPriorities.includes(rec.priority);
      return categoryMatch && priorityMatch;
    });
  }, [recommendations, selectedCategories, selectedPriorities]);

  const grouped = useMemo(() => {
    const groups: Record<string, Recommendation[]> = {};
    filteredRecommendations.forEach((rec) => {
      if (!groups[rec.category]) {
        groups[rec.category] = [];
      }
      groups[rec.category].push(rec);
    });
    return groups;
  }, [filteredRecommendations]);

  const toggleAll = () => {
    if (expandedItems.length === filteredRecommendations.length) {
      setExpandedItems([]);
    } else {
      setExpandedItems(filteredRecommendations.map((r) => r.id));
    }
  };

  if (recommendations.length === 0) {
    return null;
  }


  return (
    <AccordionItem value="recommendations">
      <AccordionSectionTitleTrigger titleClassName="flex items-center gap-2">
        <span>Recommendations</span>
        <Badge variant="outline" className="no-underline hover:no-underline">{recommendations.length}</Badge>
      </AccordionSectionTitleTrigger>
      <AccordionContent>
        <div className="p-6">
          <FilterControls
            categories={categories}
            priorities={priorities}
            selectedCategories={selectedCategories}
            selectedPriorities={selectedPriorities}
            onCategoriesChange={setSelectedCategories}
            onPrioritiesChange={setSelectedPriorities}
            filteredCount={filteredRecommendations.length}
            totalCount={recommendations.length}
            onToggleAll={toggleAll}
            expandedCount={expandedItems.length}
            totalFiltered={filteredRecommendations.length}
          />
          {Object.entries(grouped).map(([category, recs]) => (
            <div key={category} className="mb-6">
              <h3 className="text-lg font-semibold mb-4">{category}</h3>
              <Accordion
                type="multiple"
                value={expandedItems}
                onValueChange={setExpandedItems}
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
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

