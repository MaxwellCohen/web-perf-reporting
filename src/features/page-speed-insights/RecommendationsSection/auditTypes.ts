import { PageSpeedInsights } from '@/lib/schema';

export type AuditEntry = {
  auditId: string;
  audit: {
    id: string;
    title: string;
    score: number | null;
    scoreDisplayMode: string;
    description?: string;
    details?: unknown;
    explanation?: string;
    displayValue?: string;
    [key: string]: unknown;
  };
  label: string;
  item: PageSpeedInsights;
};

export type AuditDataMap = Map<string, AuditEntry[]>;

