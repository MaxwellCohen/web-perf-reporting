"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DebouncedInput } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DashboardRowDensity } from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import type { WaterfallSortBy } from "@/features/page-speed-insights/waterfall/waterfallData";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toggleMultiSelect } from "@/features/page-speed-insights/shared/MultiSelectFilterDropdown";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import {
  WATERFALL_DEBUG_PRESETS,
  WATERFALL_SIGNAL_GROUPS,
} from "@/features/page-speed-insights/waterfall/waterfallDebugPresets";
import {
  normalizeWaterfallSignals,
  WATERFALL_SIGNAL_LABEL,
  type WaterfallSignalId,
} from "@/features/page-speed-insights/waterfall/waterfallSignals";
import { cn } from "@/lib/utils";

function typeAndSignalFilterLabel(
  resourceTypes: string[],
  signals: readonly WaterfallSignalId[],
): string {
  const typeActive = resourceTypes.length > 0;
  const signalActive = signals.length > 0;
  if (!typeActive && !signalActive) return "All filters";
  if (typeActive && !signalActive) {
    return resourceTypes.length === 1
      ? toTitleCase(resourceTypes[0] ?? "")
      : `${resourceTypes.length} types`;
  }
  if (!typeActive && signalActive) {
    return signals.length === 1 ? WATERFALL_SIGNAL_LABEL[signals[0]!] : `${signals.length} signals`;
  }
  const count = resourceTypes.length + signals.length;
  return count === 2
    ? `${toTitleCase(resourceTypes[0] ?? "")}, ${WATERFALL_SIGNAL_LABEL[signals[0]!]}`
    : `${count} filters`;
}

function listedSignalsInGroup(
  groupIds: readonly WaterfallSignalId[],
  available: ReadonlySet<WaterfallSignalId>,
  selected: readonly WaterfallSignalId[],
): WaterfallSignalId[] {
  return groupIds.filter((id) => available.has(id) || selected.includes(id));
}

export function TypeAndSignalFilterDropdown({
  typeOptions,
  resourceTypes,
  onResourceTypesChange,
  availableSignals,
  signals,
  onSignalsChange,
  onApplyPreset,
}: {
  typeOptions: string[];
  resourceTypes: string[];
  onResourceTypesChange: (next: string[]) => void;
  availableSignals: readonly WaterfallSignalId[];
  signals: readonly WaterfallSignalId[];
  onSignalsChange: (next: WaterfallSignalId[]) => void;
  onApplyPreset: (presetSignals: WaterfallSignalId[]) => void;
}) {
  const available = new Set(availableSignals);
  const hasActiveFilter = resourceTypes.length > 0 || signals.length > 0;
  const label = typeAndSignalFilterLabel(resourceTypes, signals);
  const signalGroups = WATERFALL_SIGNAL_GROUPS.map((group) => ({
    ...group,
    options: listedSignalsInGroup(group.ids, available, signals),
  })).filter((group) => group.options.length > 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-full lg:w-auto"
          data-testid="waterfall-signal-filter"
          aria-label="Filter waterfall by loading metrics, resource types, and signals"
        >
          {label} <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 p-0">
        <div className="max-h-72 overflow-y-auto overscroll-y-contain p-1">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Quick presets
          </DropdownMenuLabel>
          {WATERFALL_DEBUG_PRESETS.map((preset) => (
            <DropdownMenuItem
              key={preset.id}
              className="flex flex-col items-start gap-0.5 py-2"
              onSelect={() => {
                onResourceTypesChange([]);
                onApplyPreset(preset.signals);
              }}
            >
              <span className="font-medium">{preset.label}</span>
              <span className="text-xs text-muted-foreground">{preset.description}</span>
            </DropdownMenuItem>
          ))}
          {signalGroups.length > 0 ? <div className="my-1 border-t" /> : null}
          {signalGroups.map((group) => (
            <div key={group.label}>
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {group.label}
              </DropdownMenuLabel>
              {group.options.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option}
                  checked={signals.includes(option)}
                  onCheckedChange={(checked) => {
                    const next = checked
                      ? normalizeWaterfallSignals([...signals, option])
                      : signals.filter((item) => item !== option);
                    onSignalsChange(next);
                  }}
                >
                  {WATERFALL_SIGNAL_LABEL[option]}
                </DropdownMenuCheckboxItem>
              ))}
            </div>
          ))}
          {typeOptions.length > 0 ? (
            <>
              <div className="my-1 border-t" />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Resource types
              </DropdownMenuLabel>
              {typeOptions.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option}
                  checked={resourceTypes.length === 0 || resourceTypes.includes(option)}
                  onCheckedChange={(checked) => {
                    onResourceTypesChange(
                      toggleMultiSelect(typeOptions, resourceTypes, option, checked),
                    );
                  }}
                >
                  {toTitleCase(option)}
                </DropdownMenuCheckboxItem>
              ))}
            </>
          ) : null}
        </div>
        {hasActiveFilter ? (
          <div className="border-t p-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                onResourceTypesChange([]);
                onSignalsChange([]);
              }}
            >
              Clear
            </Button>
          </div>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ToolbarField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-0.5 sm:w-[calc(50%-0.25rem)] lg:w-auto",
        className,
      )}
    >
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

export function WaterfallToolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-1.5">{children}</div>;
}

export function WaterfallFilterField({ children }: { children: ReactNode }) {
  return <ToolbarField label="Filter">{children}</ToolbarField>;
}

export function WaterfallRowsField({
  value,
  onChange,
}: {
  value: DashboardRowDensity;
  onChange: (value: DashboardRowDensity) => void;
}) {
  return (
    <ToolbarField label="Rows">
      <Select value={value} onValueChange={(next) => onChange(next as DashboardRowDensity)}>
        <SelectTrigger className="h-8 w-full lg:w-35" aria-label="Waterfall rows">
          <SelectValue placeholder="Rows" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="expanded">Expanded</SelectItem>
          <SelectItem value="collapsed">Collapsed</SelectItem>
        </SelectContent>
      </Select>
    </ToolbarField>
  );
}

export function WaterfallSortField({
  value,
  onChange,
}: {
  value: WaterfallSortBy;
  onChange: (value: WaterfallSortBy) => void;
}) {
  return (
    <ToolbarField label="Sort">
      <Select value={value} onValueChange={(next) => onChange(next as WaterfallSortBy)}>
        <SelectTrigger className="h-8 w-full lg:w-35" aria-label="Sort">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="start">Start time</SelectItem>
          <SelectItem value="end">End time</SelectItem>
          <SelectItem value="duration">Duration</SelectItem>
          <SelectItem value="size">Transfer size</SelectItem>
        </SelectContent>
      </Select>
    </ToolbarField>
  );
}

export function WaterfallSearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <ToolbarField label="Search" className="sm:w-full lg:min-w-40 lg:flex-1">
      <DebouncedInput
        value={value}
        onChange={(next) => onChange(String(next))}
        placeholder="Search URL…"
        aria-label="Search URL"
        className="h-8 w-full"
      />
    </ToolbarField>
  );
}

export function WaterfallRowCount({ children }: { children: ReactNode }) {
  return <p className="w-full text-xs text-muted-foreground lg:ml-auto lg:w-auto">{children}</p>;
}
