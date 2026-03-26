import type { DateRange } from "../types";

export function formatDateRangeDisplay(dateRange?: DateRange): string {
  if (!dateRange?.startDate && !dateRange?.endDate) {
    return "Select date range";
  }
  if (dateRange.startDate && dateRange.endDate) {
    const start = new Date(dateRange.startDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const end = new Date(dateRange.endDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${start} - ${end}`;
  }
  if (dateRange.startDate) {
    return `From ${new Date(dateRange.startDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }
  if (dateRange.endDate) {
    return `Until ${new Date(dateRange.endDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }
  return "Select date range";
}
