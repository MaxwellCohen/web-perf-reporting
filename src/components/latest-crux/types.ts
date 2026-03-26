import type { CruxReport } from "@/lib/schema";

export type Scope = "origin" | "url";
export type DeviceType = "All" | "DESKTOP" | "TABLET" | "PHONE";

export type DateRange = {
  startDate: string | null;
  endDate: string | null;
};

export type CruxReportMapKey = `${Scope}${DeviceType}`;

export type CruxReportMap = Record<CruxReportMapKey, CruxReport | null>;
