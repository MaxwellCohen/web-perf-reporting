import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RenderDetails } from '@/components/page-speed/lh-categories/RenderDetails';
import type { TableDataItem } from '@/components/page-speed/tsTable/TableDataItem';

vi.mock('@/components/page-speed/Timeline', () => ({
  Timeline: () => <div data-testid="timeline" />,
}));

vi.mock('@/components/page-speed/lh-categories/RenderChecklist', () => ({
  RenderChecklist: () => <div data-testid="checklist" />,
}));

vi.mock('@/components/page-speed/lh-categories/table/RenderTable', () => ({
  DetailTable: () => <div data-testid="detail-table" />,
}));

vi.mock('@/components/page-speed/lh-categories/RenderDebugdata', () => ({
  RenderDebugData: () => <div data-testid="debug-data" />,
}));

vi.mock('@/components/page-speed/lh-categories/table/RenderCriticalChain', () => ({
  RenderCriticalChainData: () => <div data-testid="critical-chain" />,
}));

vi.mock('@/components/page-speed/JSUsage/JSUsageSection', () => ({
  JSUsageAccordion: () => <div data-testid="js-usage" />,
}));

vi.mock('@/components/page-speed/lh-categories/table/RenderNetworkDependencyTree', () => ({
  RenderNetworkDependencyTree: () => <div data-testid="network-tree" />,
}));

function makeItem(
  detailsType: string,
  details: unknown,
  userLabel = 'Mobile',
): TableDataItem {
  return {
    _userLabel: userLabel,
    _category: {} as any,
    auditRef: {},
    auditResult: {
      id: 'test',
      title: 'Test Audit',
      details: { type: detailsType, ...(details && typeof details === 'object' ? details : {}) } as any,
    } as any,
  };
}

describe('RenderDetails', () => {
  it('returns null when items have mixed detail types', () => {
    const items = [
      makeItem('table', {}),
      makeItem('list', {}),
    ];
    const { container } = render(<RenderDetails items={items} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when items have no detail type', () => {
    const items = [
      { ...makeItem('table', {}), auditResult: { ...makeItem('table', {}).auditResult, details: {} } } as any,
    ];
    const { container } = render(<RenderDetails items={items} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders DetailTable when single item with table type', () => {
    const items = [
      makeItem('table', {}),
    ];
    const { container } = render(<RenderDetails items={items} />);
    expect(container.querySelector('[data-testid="detail-table"]')).toBeTruthy();
  });

  it('renders RenderChecklist for checklist type', () => {
    const items = [
      makeItem('checklist', { items: {} }),
      makeItem('checklist', { items: {} }, 'Desktop'),
    ];
    const { container } = render(<RenderDetails items={items} />);
    expect(container.querySelector('[data-testid="checklist"]')).toBeTruthy();
  });

  it('renders DetailTable for table type', () => {
    const items = [
      makeItem('table', {}),
      makeItem('table', {}),
    ];
    const { container } = render(<RenderDetails items={items} />);
    expect(container.querySelector('[data-testid="detail-table"]')).toBeTruthy();
  });

  it('returns null for screenshot type', () => {
    const items = [
      makeItem('screenshot', {}),
      makeItem('screenshot', {}),
    ];
    const { container } = render(<RenderDetails items={items} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders RenderDebugData for debugdata type', () => {
    const items = [
      makeItem('debugdata', {}),
      makeItem('debugdata', {}),
    ];
    const { container } = render(<RenderDetails items={items} />);
    expect(container.querySelector('[data-testid="debug-data"]')).toBeTruthy();
  });

  it('returns null for unknown detail type', () => {
    const items = [
      makeItem('unknown' as any, {}),
      makeItem('unknown' as any, {}),
    ];
    const { container } = render(<RenderDetails items={items} />);
    expect(container.firstChild).toBeNull();
  });
});