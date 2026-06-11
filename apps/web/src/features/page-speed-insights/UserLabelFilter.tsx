"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  selectPageSpeedUserLabelFilter,
  selectPageSpeedUserLabels,
  usePageSpeedSelector,
  useRequiredPageSpeedInsightsStore,
} from "@/features/page-speed-insights/PageSpeedContext";
import { ChevronDown } from "lucide-react";

export function UserLabelFilter() {
  const store = useRequiredPageSpeedInsightsStore();
  const labels = usePageSpeedSelector(selectPageSpeedUserLabels);
  const userLabelFilter = usePageSpeedSelector(selectPageSpeedUserLabelFilter);

  if (labels.length <= 1) {
    return null;
  }

  const activeFilter = userLabelFilter ?? labels;
  const sortedLabels = [...labels].sort();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
        >
          Filter User Label <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {sortedLabels.map((label) => (
          <DropdownMenuCheckboxItem
            key={label}
            checked={activeFilter.includes(label)}
            onCheckedChange={(checked) => {

              if (checked) {
                store.trigger.setUserLabelFilter({
                  labels: [...new Set([...activeFilter, label])],
                });
              } else {
                const next = activeFilter.filter((value) => value !== label);
                store.trigger.setUserLabelFilter({
                  labels: next.length === 0 ? sortedLabels : next,
                });
              }
            }}
          >
            {label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
