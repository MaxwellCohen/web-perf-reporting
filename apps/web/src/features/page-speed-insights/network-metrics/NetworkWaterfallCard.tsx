"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DebouncedInput } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { InteractiveNetworkWaterfall } from "@/features/page-speed-insights/network-metrics/InteractiveNetworkWaterfall";
import {
  buildWaterfallRows,
  filterWaterfallRows,
  getWaterfallResourceTypes,
  getWaterfallTimeRange,
  sortWaterfallRows,
  type WaterfallSortBy,
} from "@/features/page-speed-insights/network-metrics/networkWaterfallData";
import { useNetworkMetricSeries } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsStore";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import { cn } from "@/lib/utils";

function ResourceTypeFilterDropdown({
  options,
  selected,
  onSelectedChange,
  className,
}: {
  options: string[];
  selected: string[];
  onSelectedChange: (next: string[]) => void;
  className?: string;
}) {
  const label =
    selected.length === 0
      ? "All resource types"
      : selected.length === 1
        ? toTitleCase(selected[0] ?? "")
        : `${selected.length} types`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn("h-9", className)}>
          {label} <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option}
            checked={selected.length === 0 || selected.includes(option)}
            onCheckedChange={(checked) => {
              if (checked) {
                const next = selected.includes(option) ? selected : [...selected, option];
                onSelectedChange(next.length === options.length ? [] : next);
              } else {
                const base = selected.length === 0 ? options : selected;
                onSelectedChange(base.filter((item) => item !== option));
              }
            }}
          >
            {toTitleCase(option)}
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

function ToolbarField({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("w-full md:w-auto", className)}>{children}</div>;
}

export function NetworkWaterfallCard() {
  const series = useNetworkMetricSeries();
  const [selectedReportIndex, setSelectedReportIndex] = useState(0);
  const [resourceTypes, setResourceTypes] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<WaterfallSortBy>("start");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const validSeries = useMemo(
    () => series.filter((entry) => entry.networkRequests.length > 0),
    [series],
  );

  const activeIndex = Math.min(selectedReportIndex, Math.max(validSeries.length - 1, 0));
  const activeSeries = validSeries[activeIndex];

  const allRows = useMemo(
    () => (activeSeries ? buildWaterfallRows(activeSeries.networkRequests) : []),
    [activeSeries],
  );

  const resourceTypeOptions = useMemo(() => getWaterfallResourceTypes(allRows), [allRows]);

  const displayRows = useMemo(() => {
    const filtered = filterWaterfallRows(allRows, { resourceTypes, search });
    return sortWaterfallRows(filtered, sortBy);
  }, [allRows, resourceTypes, search, sortBy]);

  const timeRange = useMemo(() => getWaterfallTimeRange(displayRows), [displayRows]);

  const milestones = activeSeries
    ? {
        fcp: activeSeries.fcp,
        lcp: activeSeries.lcp,
        domContentLoaded: activeSeries.domContentLoaded,
      }
    : undefined;

  if (!validSeries.length || !activeSeries || !timeRange) {
    return null;
  }

  return (
    <Card className="md:col-span-2 lg:col-span-3 w-full min-w-0">
      <CardHeader>
        <CardTitle>Network Waterfall</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
          {validSeries.length > 1 ? (
            <ToolbarField>
              <Select
                value={String(activeIndex)}
                onValueChange={(value) => {
                  setSelectedReportIndex(Number(value));
                  setSelectedRowId(null);
                }}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Select report" />
                </SelectTrigger>
                <SelectContent>
                  {validSeries.map((entry, index) => (
                    <SelectItem key={entry.label || `report-${index}`} value={String(index)}>
                      {entry.label || `Report ${index + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ToolbarField>
          ) : null}

          <ToolbarField>
            <ResourceTypeFilterDropdown
              options={resourceTypeOptions}
              selected={resourceTypes}
              onSelectedChange={setResourceTypes}
              className="w-full md:w-auto"
            />
          </ToolbarField>

          <ToolbarField>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as WaterfallSortBy)}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="start">Start time</SelectItem>
                <SelectItem value="duration">Duration</SelectItem>
                <SelectItem value="size">Transfer size</SelectItem>
              </SelectContent>
            </Select>
          </ToolbarField>

          <ToolbarField className="md:min-w-[200px] md:flex-1">
            <DebouncedInput
              value={search}
              onChange={(value) => setSearch(String(value))}
              placeholder="Search URL…"
              className="w-full"
            />
          </ToolbarField>

          <p className="text-sm text-muted-foreground md:ml-auto">
            {displayRows.length} of {allRows.length} requests
          </p>
        </div>

        <InteractiveNetworkWaterfall
          rows={displayRows}
          timeRange={timeRange}
          milestones={milestones}
          selectedId={selectedRowId}
          onSelectRow={setSelectedRowId}
        />
      </CardContent>
    </Card>
  );
}
