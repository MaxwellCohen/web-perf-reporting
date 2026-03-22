import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RecommendationItem } from '@/features/page-speed-insights/RecommendationsSection/RecommendationItem';

vi.mock('@/features/page-speed-insights/PageSpeedContext', () => ({
  usePageSpeedItems: vi.fn(() => []),
}));

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/accordion', () => ({
  AccordionItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  AccordionContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/features/page-speed-insights/RecommendationsSection/RecommendationHeader', () => ({
  RecommendationHeader: ({ recommendation }: { recommendation: { title: string } }) => (
    <span>{recommendation.title}</span>
  ),
}));

vi.mock('@/features/page-speed-insights/RecommendationsSection/ActionableStepsTable', () => ({
  ActionableStepsTable: () => <div data-testid="actionable-steps" />,
}));

vi.mock('@/features/page-speed-insights/RecommendationsSection/ResourcesTable', () => ({
  ResourcesTable: () => <div data-testid="resources-table" />,
}));

vi.mock('@/features/page-speed-insights/RecommendationsSection/RecommendationNetworkTree', () => ({
  RecommendationNetworkTree: () => <div data-testid="network-tree" />,
}));

vi.mock('@/features/page-speed-insights/RecommendationsSection/RecommendationAuditDetails', () => ({
  RecommendationAuditDetails: () => <div data-testid="audit-details" />,
}));

vi.mock('@/features/page-speed-insights/RecommendationsSection/RecommendationIssuesSection', () => ({
  RecommendationIssuesSection: () => <div data-testid="issues-section" />,
}));

const mockRec: Parameters<typeof RecommendationItem>[0]['rec'] = {
  id: 'unused-css',
  title: 'Remove unused CSS',
  description: 'Some description',
  priority: 'high',
  category: 'performance',
  impact: {},
  actionableSteps: [],
  items: [],
};

describe('RecommendationItem', () => {
  it('renders recommendation header', () => {
    const { container } = render(
      <RecommendationItem
        rec={mockRec}
        items={[]}
        priorityColors={{ high: 'red' }}
      />
    );
    expect(container.textContent).toContain('Remove unused CSS');
  });

  it('renders description when present', () => {
    const { container } = render(
      <RecommendationItem
        rec={{ ...mockRec, description: 'Fix this issue' }}
        items={[]}
        priorityColors={{}}
      />
    );
    expect(container.textContent).toContain('Fix this issue');
  });

  it('renders ResourcesTable when items exist', () => {
    const { container } = render(
      <RecommendationItem
        rec={{ ...mockRec, items: [{ url: 'https://example.com/style.css' } as any] }}
        items={[]}
        priorityColors={{}}
      />
    );
    expect(container.querySelector('[data-testid="resources-table"]')).toBeTruthy();
  });
});
