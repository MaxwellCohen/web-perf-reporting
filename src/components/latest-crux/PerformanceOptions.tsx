'use client';

import { DateRangePopover } from '@/components/latest-crux/options/DateRangePopover';
import type { DateRange, DeviceType, Scope } from '@/components/latest-crux/types';
import { Card } from '@/components/ui/card';
import { OptionsSelector } from '@/components/common/OptionsSelector';
import type { ReactNode } from 'react';
import { useId } from 'react';

export type { DateRange, DeviceType, Scope } from '@/components/latest-crux/types';

interface PerformanceOptionsProps {
  setChartType: (value: string) => void;
  setReportScope: (value: Scope) => void;
  setDeviceType: (value: DeviceType) => void;
  chartKeys: string[];
  children?: ReactNode;
  dateRange?: DateRange;
  setDateRange?: (range: DateRange) => void;
}

export function PerformanceOptions({
  setChartType,
  setReportScope,
  setDeviceType,
  chartKeys,
  children,
  dateRange,
  setDateRange,
}: PerformanceOptionsProps) {
  const id = useId();
  return (
    <Card className="flex flex-row gap-2 flex-wrap sticky pl-2">
      <OptionsSelector
        id={`current-chart-scope${id}`}
        title="Report Scope"
        onValueChange={(value) => setReportScope(value as Scope)}
        options={[
          { value: 'origin', label: 'Whole Site' },
          { value: 'url', label: 'Current Page' },
        ]}
      />
      <OptionsSelector
        id={`current-chart-device${id}`}
        title="Device"
        onValueChange={(value) => setDeviceType(value as DeviceType)}
        options={[
          'All',
          { value: 'DESKTOP', label: 'Desktop' },
          { value: 'TABLET', label: 'Tablet' },
          { value: 'PHONE', label: 'Phone' },
        ] as const}
      />
      <OptionsSelector
        id={`current-chart-type${id}`}
        title="Chart type"
        onValueChange={setChartType}
        options={chartKeys}
      />
      {setDateRange && (
        <DateRangePopover
          id={id}
          dateRange={dateRange}
          setDateRange={setDateRange}
        />
      )}
      {children}
    </Card>
  );
}
