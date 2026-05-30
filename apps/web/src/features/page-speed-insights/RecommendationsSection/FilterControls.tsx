import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

function MultiSelectFilterDropdown({
  triggerLabel,
  options,
  selected,
  onSelectedChange,
  renderOption,
}: {
  triggerLabel: string;
  options: string[];
  selected: string[];
  onSelectedChange: (next: string[]) => void;
  renderOption?: (value: string) => ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          {triggerLabel} <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option}
            checked={selected.length === 0 || selected.includes(option)}
            onCheckedChange={(checked) => {
              if (checked) {
                // If adding back the last unchecked item, reset to [] ("all selected")
                const next = selected.includes(option) ? selected : [...selected, option];
                onSelectedChange(next.length === options.length ? [] : next);
              } else {
                // If currently "all selected" (empty), explicitly select all except this one
                const base = selected.length === 0 ? options : selected;
                onSelectedChange(base.filter((item) => item !== option));
              }
            }}
          >
            {renderOption ? renderOption(option) : option}
          </DropdownMenuCheckboxItem>
        ))}
        <div className="mt-1 border-t pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => onSelectedChange([])}
          >
            Clear
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
        triggerLabel="Filter by Category"
        options={categories}
        selected={selectedCategories}
        onSelectedChange={onCategoriesChange}
      />
      <MultiSelectFilterDropdown
        triggerLabel="Filter by Priority"
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
