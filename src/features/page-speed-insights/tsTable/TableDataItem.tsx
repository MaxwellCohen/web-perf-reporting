import { CategoryResult, AuditRef, AuditResult } from '@/lib/schema';


export type TableDataItem = {
  _category: Omit<CategoryResult, 'auditRefs'>;
  _userLabel: string;
  auditRef: AuditRef;
  auditResult: AuditResult;
};
