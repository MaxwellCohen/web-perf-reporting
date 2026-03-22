import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';


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
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleAll}
        >
          {expandedCount === totalFiltered
            ? 'Collapse All'
            : 'Expand All'}
        </Button>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            Filter by Category <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {categories.map((category) => (
            <DropdownMenuCheckboxItem
              key={category}
              checked={
                selectedCategories.length === 0 ||
                selectedCategories.includes(category)
              }
              onCheckedChange={(checked) => {
                if (checked) {
                  onCategoriesChange(
                    selectedCategories.includes(category)
                      ? selectedCategories
                      : [...selectedCategories, category]
                  );
                } else {
                  onCategoriesChange(selectedCategories.filter((c) => c !== category));
                }
              }}
            >
              {category}
            </DropdownMenuCheckboxItem>
          ))}
          <div className="border-t pt-1 mt-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => onCategoriesChange([])}
            >
              Clear
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            Filter by Priority <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {priorities.map((priority) => (
            <DropdownMenuCheckboxItem
              key={priority}
              checked={
                selectedPriorities.length === 0 ||
                selectedPriorities.includes(priority)
              }
              onCheckedChange={(checked) => {
                if (checked) {
                  onPrioritiesChange(
                    selectedPriorities.includes(priority)
                      ? selectedPriorities
                      : [...selectedPriorities, priority]
                  );
                } else {
                  onPrioritiesChange(selectedPriorities.filter((p) => p !== priority));
                }
              }}
            >
              <span className="capitalize">{priority}</span>
            </DropdownMenuCheckboxItem>
          ))}
          <div className="border-t pt-1 mt-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => onPrioritiesChange([])}
            >
              Clear
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
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

