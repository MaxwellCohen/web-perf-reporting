import { Button } from "@/components/ui/button";
import { MultiSelectFilterDropdown } from "@/features/page-speed-insights/shared/MultiSelectFilterDropdown";

interface FilterControlsProps {
  categories: string[];
  priorities: string[];
  selectedCategories: string[];
  selectedPriorities: string[];
  onCategoriesChange: (categories: string[]) => void;
  onPrioritiesChange: (priorities: string[]) => void;
  filteredCount: number;
  totalCount: number;
  onToggleAll: () => void;
  expandedCount: number;
  totalFiltered: number;
}

export function FilterControls({
  categories,
  priorities,
  selectedCategories,
  selectedPriorities,
  onCategoriesChange,
  onPrioritiesChange,
  filteredCount,
  totalCount,
  onToggleAll,
  expandedCount,
  totalFiltered,
}: FilterControlsProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onToggleAll}>
          {expandedCount === totalFiltered ? "Collapse All" : "Expand All"}
        </Button>
      </div>
      <MultiSelectFilterDropdown
        trigger="Filter by Category"
        buttonClassName="h-9"
        options={categories}
        selected={selectedCategories}
        onSelectedChange={onCategoriesChange}
      />
      <MultiSelectFilterDropdown
        trigger="Filter by Priority"
        buttonClassName="h-9"
        options={priorities}
        selected={selectedPriorities}
        onSelectedChange={onPrioritiesChange}
        renderOption={(priority) => <span className="capitalize">{priority}</span>}
      />
      {(selectedCategories.length > 0 || selectedPriorities.length > 0) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onCategoriesChange([]);
            onPrioritiesChange([]);
          }}
        >
          Reset Filters
        </Button>
      )}
      <div className="ml-auto text-sm text-muted-foreground">
        Showing {filteredCount} of {totalCount} recommendations
      </div>
    </div>
  );
}
