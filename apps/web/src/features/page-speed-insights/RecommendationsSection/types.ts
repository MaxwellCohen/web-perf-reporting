import { TableColumnHeading, TableItem } from "@/lib/schema";

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  category: string;
  impact: {
    metric?: string;
    savings?: number;
    unit?: string;
  };
  items?: Array<{
    url?: string;
    wastedBytes?: number;
    wastedMs?: number;
    totalBytes?: number;
    [key: string]: unknown;
  }>;
  actionableSteps: ActionableStep[];
  tableData?: {
    headings: TableColumnHeading[];
    items: TableItem[];
    itemsByReport?: Map<string, TableItem[]>;
  };
}

export interface ActionableStep {
  step: string;
  reports: string[];
  url?: string; // URL of the resource if this step references a specific resource
  host?: string; // Host/origin of the resource, for grouping steps by host
}
