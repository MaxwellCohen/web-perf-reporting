import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RenderChecklist } from '@/features/page-speed-insights/lh-categories/RenderChecklist';
import type { TableDataItem } from '@/features/page-speed-insights/tsTable/TableDataItem';

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
}));

vi.mock('@/components/ui/accordion', () => ({
  Details: ({ children }: { children: React.ReactNode }) => <details>{children}</details>,
}));

vi.mock('@/features/page-speed-insights/lh-categories/renderBoolean', () => ({
  renderBoolean: (v: boolean) => <span>{v ? 'Yes' : 'No'}</span>,
}));

function makeItem(
  label: string,
  items: Record<string, { label?: string; value?: boolean }>,
): TableDataItem {
  return {
    _userLabel: label,
    _category: {} as any,
    auditRef: {},
    auditResult: {
      id: 'test',
      details: { type: 'checklist', items },
    } as any,
  };
}

describe('RenderChecklist', () => {
  it('renders table with title', () => {
    const items = [
      makeItem('Mobile', { item1: { label: 'Item 1', value: true } }),
    ];
    const { container } = render(<RenderChecklist items={items} title="Performance" />);
    expect(container.textContent).toContain('Performance Audit Checklist Items');
    expect(container.querySelector('table')).toBeTruthy();
  });

  it('renders checklist items from multiple items', () => {
    const items = [
      makeItem('Mobile', { a: { label: 'Check A', value: true } }),
      makeItem('Desktop', { a: { label: 'Check A', value: false } }),
    ];
    const { container } = render(<RenderChecklist items={items} title="Test" />);
    expect(container.textContent).toContain('Check A');
  });

  it('renders device labels as column headers', () => {
    const items = [
      makeItem('Mobile', {}),
      makeItem('Desktop', {}),
    ];
    const { container } = render(<RenderChecklist items={items} title="Test" />);
    expect(container.textContent).toContain('Mobile');
    expect(container.textContent).toContain('Desktop');
  });
});