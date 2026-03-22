import type {
  AuditDetailOpportunity,
  AuditDetailTable,
  ItemValueType,
} from '@/lib/schema';
import {
  GROUPABLE_VALUE_TYPES,
  NUMERIC_VALUE_TYPES,
} from '@/features/page-speed-insights/lh-categories/table/constants';

export type DetailTableItem = {
  auditResult: {
    id?: string;
    details: AuditDetailTable | AuditDetailOpportunity;
  };
  _userLabel: string;
};

export const canGroup = (type: ItemValueType | string): boolean => {
  return GROUPABLE_VALUE_TYPES.includes(type as ItemValueType);
};

export const canSort = (type: ItemValueType | string): boolean => {
  return type !== 'node';
};

export const isNumberColumn = (type: ItemValueType | string): boolean => {
  return NUMERIC_VALUE_TYPES.includes(type as ItemValueType);
};
