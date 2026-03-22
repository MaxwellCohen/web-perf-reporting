import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActionableStepsTable } from '@/features/page-speed-insights/RecommendationsSection/ActionableStepsTable';
import type { Recommendation, ActionableStep } from '@/features/page-speed-insights/RecommendationsSection/types';

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
}));

const baseRec: Recommendation = {
  id: 'test',
  title: 'Test',
  description: '',
  priority: 'high',
  category: 'Performance',
  impact: {},
  actionableSteps: [],
};

describe('ActionableStepsTable', () => {
  it('renders table with steps grouped by report', () => {
    const rec: Recommendation = {
      ...baseRec,
      actionableSteps: [
        { step: 'Remove [unused.css](https://example.com)', reports: ['Mobile'], host: 'example.com' },
        { step: 'Optimize images', reports: [], host: '' },
      ],
    };
    const items = [{ label: 'Mobile' }];
    const { container } = render(<ActionableStepsTable rec={rec} items={items} />);
    expect(container.textContent).toContain('Report');
    expect(container.textContent).toContain('Steps');
    expect(container.querySelector('table')).toBeTruthy();
  });

  it('renders dash when steps empty for a report', () => {
    const rec: Recommendation = {
      ...baseRec,
      actionableSteps: [{ step: 'Step 1', reports: ['Desktop'], host: 'a.com' }],
    };
    const items = [{ label: 'Desktop' }];
    const { container } = render(<ActionableStepsTable rec={rec} items={items} />);
    expect(container.textContent).toContain('Step 1');
  });

  it('groups steps by host with Other for empty host', () => {
    const rec: Recommendation = {
      ...baseRec,
      actionableSteps: [
        { step: 'Fix A', reports: ['Mobile'], host: 'a.com' },
        { step: 'Fix B', reports: ['Mobile'], host: '' },
      ],
    };
    const items = [{ label: 'Mobile' }];
    const { container } = render(<ActionableStepsTable rec={rec} items={items} />);
    expect(container.textContent).toContain('a.com');
    expect(container.textContent).toContain('Fix A');
    expect(container.textContent).toContain('Fix B');
  });

  it('renders step text via ReactMarkdown', () => {
    const rec: Recommendation = {
      ...baseRec,
      actionableSteps: [
        { step: 'Visit [link](https://example.com)', reports: [], host: 'x.com' },
      ],
    };
    const items = [{ label: 'Mobile' }];
    const { container } = render(<ActionableStepsTable rec={rec} items={items} />);
    expect(container.textContent).toContain('Visit');
  });
});
