import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

/** Next selection after toggling `option`; [] means "all selected". */
export function toggleMultiSelect<TOption extends string>(
  options: readonly TOption[],
  selected: readonly TOption[],
  option: TOption,
  checked: boolean,
): TOption[] {
  if (checked) {
    const next = selected.includes(option) ? [...selected] : [...selected, option];
    return next.length === options.length ? [] : next;
  }
  const base = selected.length === 0 ? options : selected;
  return base.filter((item) => item !== option);
}

/**
 * Multi-select dropdown where an empty selection means "show everything".
 */
export function MultiSelectFilterDropdown<TOption extends string>({
  trigger,
  options,
  selected,
  onSelectedChange,
  renderOption,
  buttonClassName,
  chevronClassName = "ml-2 h-4 w-4",
  ariaLabel,
}: {
  /** Content of the outline trigger button (a label or a computed label). */
  trigger: ReactNode;
  options: readonly TOption[];
  selected: readonly TOption[];
  onSelectedChange: (next: TOption[]) => void;
  renderOption?: (option: TOption) => ReactNode;
  buttonClassName?: string;
  chevronClassName?: string;
  ariaLabel?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={buttonClassName} aria-label={ariaLabel}>
          {trigger} <ChevronDown className={chevronClassName} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option}
            checked={selected.length === 0 || selected.includes(option)}
            onCheckedChange={(checked) => {
              onSelectedChange(toggleMultiSelect(options, selected, option, checked));
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
