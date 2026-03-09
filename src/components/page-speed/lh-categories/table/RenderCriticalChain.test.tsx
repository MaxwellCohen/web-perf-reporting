import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RenderCriticalChainData } from '@/components/page-speed/lh-categories/table/RenderCriticalChain';

vi.mock('@/components/ui/accordion', () => ({
  Details: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <details className={className}>{children}</details>,
}));

vi.mock('@/components/ui/tree-view', () => ({
  TreeView: ({ data }: { data: { id: string; name: string }[] }) => (
    <div data-testid="tree-view">
      {data.map((d) => (
        <div key={d.id} data-testid="tree-node">
          {d.name}
        </div>
      ))}
    </div>
  ),
}));

describe('RenderCriticalChainData', () => {
  it('renders mobile section when mobileDetails has chains', () => {
    const mobileDetails = {
      longestChain: { duration: 100, length: 3, transferSize: 5000 },
      chains: {
        '0': {
          request: {
            url: 'https://example.com',
            startTime: 0,
            endTime: 0.1,
            transferSize: 1000,
          },
        },
      },
    };
    const { container } = render(
      <RenderCriticalChainData mobileDetails={mobileDetails as any} />
    );
    expect(container.textContent).toContain('Critical Request Chains');
    expect(container.textContent).toContain('Mobile');
    expect(container.querySelector('[data-testid="tree-view"]')).toBeTruthy();
  });

  it('renders desktop section when desktopDetails has chains', () => {
    const desktopDetails = {
      longestChain: { duration: 50, length: 2, transferSize: 2000 },
      chains: {
        '0': {
          request: {
            url: 'https://example.com/script.js',
            startTime: 0,
            endTime: 0.05,
            transferSize: 500,
          },
        },
      },
    };
    const { container } = render(
      <RenderCriticalChainData desktopDetails={desktopDetails as any} />
    );
    expect(container.textContent).toContain('Desktop');
  });

  it('renders both sections when both provided', () => {
    const mobileDetails = {
      longestChain: { duration: 10, length: 1, transferSize: 100 },
      chains: { '0': { request: { url: 'm', startTime: 0, endTime: 0.01, transferSize: 100 } } },
    };
    const desktopDetails = {
      longestChain: { duration: 20, length: 2, transferSize: 200 },
      chains: { '0': { request: { url: 'd', startTime: 0, endTime: 0.02, transferSize: 200 } } },
    };
    const { container } = render(
      <RenderCriticalChainData
        mobileDetails={mobileDetails as any}
        desktopDetails={desktopDetails as any}
      />
    );
    expect(container.textContent).toContain('Mobile');
    expect(container.textContent).toContain('Desktop');
  });

  it('renders nothing for chains when neither has chains', () => {
    const { container } = render(
      <RenderCriticalChainData />
    );
    expect(container.textContent).toContain('Critical Request Chains');
    expect(container.querySelector('details')).toBeTruthy();
  });
});
