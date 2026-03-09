import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkRequestsSummaryCard } from '@/components/page-speed/network-metrics/NetworkRequestsSummaryCard';

vi.mock('@/components/page-speed/lh-categories/table/RenderTableValue', () => ({
  RenderBytesValue: ({ value, className }: { value: unknown; className?: string }) => {
    const bytes = Math.floor(Number(value));
    const kb = bytes / 1024;
    const mb = kb / 1024;
    const display =
      mb > 1 ? `${mb.toFixed(2)} MB` : kb > 1 ? `${kb.toFixed(2)} KB` : `${bytes} bytes`;
    return (
      <span title="bytes" className={className ?? ''}>
        {display}
      </span>
    );
  },
}));

describe('NetworkRequestsSummaryCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });
  it('returns null when stats is empty', () => {
    const { container } = render(<NetworkRequestsSummaryCard stats={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when all stats have zero totalRequests', () => {
    const { container } = render(
      <NetworkRequestsSummaryCard
        stats={[
          { label: 'A', totalRequests: 0, totalTransferSize: 0, totalResourceSize: 0 },
          { label: 'B', totalRequests: 0, totalTransferSize: 0, totalResourceSize: 0 },
        ]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders card with title and table when stats have requests', () => {
    const { container } = render(
      <NetworkRequestsSummaryCard
        stats={[
          {
            label: 'Desktop',
            totalRequests: 10,
            totalTransferSize: 1024,
            totalResourceSize: 2048,
          },
        ]}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('does not show Report column when single valid stat', () => {
    const { container } = render(
      <NetworkRequestsSummaryCard
        stats={[
          {
            label: 'Only',
            totalRequests: 5,
            totalTransferSize: 100,
            totalResourceSize: 200,
          },
        ]}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('shows Report column when multiple valid stats', () => {
    const { container } = render(
      <NetworkRequestsSummaryCard
        stats={[
          { label: 'Desktop', totalRequests: 1, totalTransferSize: 0, totalResourceSize: 0 },
          { label: 'Mobile', totalRequests: 1, totalTransferSize: 0, totalResourceSize: 0 },
        ]}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('filters out stats with zero totalRequests', () => {
    const { container } = render(
      <NetworkRequestsSummaryCard
        stats={[
          { label: 'Zero', totalRequests: 0, totalTransferSize: 0, totalResourceSize: 0 },
          {
            label: 'Valid',
            totalRequests: 3,
            totalTransferSize: 500,
            totalResourceSize: 600,
          },
        ]}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('shows Unknown for empty label when report column shown', () => {
    const { container } = render(
      <NetworkRequestsSummaryCard
        stats={[
          { label: '', totalRequests: 1, totalTransferSize: 0, totalResourceSize: 0 },
          { label: 'B', totalRequests: 1, totalTransferSize: 0, totalResourceSize: 0 },
        ]}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
