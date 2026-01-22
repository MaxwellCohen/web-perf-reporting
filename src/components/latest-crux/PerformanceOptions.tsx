'use client';

import { Card } from '@/components/ui/card';
import { OptionsSelector } from '@/components/common/OptionsSelector';
import { ReactNode, useId } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';

export type Scope = 'origin' | 'url';
export type DeviceType = 'All' | 'DESKTOP' | 'TABLET' | 'PHONE';

export type DateRange = {
  startDate: string | null;
  endDate: string | null;
};

interface PerformanceOptionsProps {
  setChartType: (value: string) => void;

  setReportScope: (value: Scope) => void;

  setDeviceType: (value: DeviceType) => void;
  chartKeys: string[];
  children?: ReactNode;
  dateRange?: DateRange;
  setDateRange?: (range: DateRange) => void;
}

// Helper function to format date range for display
function formatDateRangeDisplay(dateRange?: DateRange): string {
  if (!dateRange?.startDate && !dateRange?.endDate) {
    return 'Select date range';
  }
  if (dateRange.startDate && dateRange.endDate) {
    const start = new Date(dateRange.startDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const end = new Date(dateRange.endDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${start} - ${end}`;
  }
  if (dateRange.startDate) {
    return `From ${new Date(dateRange.startDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;
  }
  if (dateRange.endDate) {
    return `Until ${new Date(dateRange.endDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;
  }
  return 'Select date range';
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
        <div className="">
          <Label className="text-center my-2 block" htmlFor={`date-range-button${id}`}>
            <div>Date Range</div>
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id={`date-range-button${id}`}
                variant="outline"
                className="mb-2 w-40 text-xs justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span className="truncate">{formatDateRangeDisplay(dateRange)}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="start">
              <div className="flex flex-col gap-4">
                <div className="flex gap-2 items-center">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`date-range-start${id}`}>Start Date</Label>
                    <Input
                      id={`date-range-start${id}`}
                      type="date"
                      value={dateRange?.startDate || ''}
                      onChange={(e) =>
                        setDateRange({
                          startDate: e.target.value || null,
                          endDate: dateRange?.endDate || null,
                        })
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`date-range-end${id}`}>End Date</Label>
                    <Input
                      id={`date-range-end${id}`}
                      type="date"
                      value={dateRange?.endDate || ''}
                      onChange={(e) =>
                        setDateRange({
                          startDate: dateRange?.startDate || null,
                          endDate: e.target.value || null,
                        })
                      }
                      min={dateRange?.startDate || undefined}
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
    {children}
    </Card>
  );
}