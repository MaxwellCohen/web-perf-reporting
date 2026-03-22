'use client';

import { formatDateRangeDisplay } from '@/components/latest-crux/lib/formatDateRangeDisplay';
import type { DateRange } from '@/components/latest-crux/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';

export function DateRangePopover({
  id,
  dateRange,
  setDateRange,
}: {
  id: string;
  dateRange?: DateRange;
  setDateRange: (range: DateRange) => void;
}) {
  return (
    <div className="">
      <Label
        className="text-center my-2 block"
        htmlFor={`date-range-button${id}`}
      >
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
            <span className="truncate">
              {formatDateRangeDisplay(dateRange)}
            </span>
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
  );
}
