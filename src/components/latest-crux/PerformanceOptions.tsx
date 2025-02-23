'use client';

import { Card } from '@/components/ui/card';
import { OptionsSelector } from '@/components/common/OptionsSelector';
import { ReactNode, useId } from 'react';

export type Scope = 'origin' | 'url';
export type DeviceType = 'All' | 'DESKTOP' | 'TABLET' | 'PHONE';

interface PerformanceOptionsProps {
  setChartType: (value: string) => void;

  setReportScope: (value: Scope) => void;

  setDeviceType: (value: DeviceType) => void;
  chartKeys: string[];
  children?: ReactNode
}

export function PerformanceOptions({
  setChartType,
  setReportScope,
  setDeviceType,
  chartKeys,
  children
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
    {children}
    </Card>
  );
}