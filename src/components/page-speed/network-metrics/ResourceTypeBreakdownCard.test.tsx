import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResourceTypeBreakdownCard } from '@/components/page-speed/network-metrics/ResourceTypeBreakdownCard';

describe('ResourceTypeBreakdownCard', () => {
  it('returns null when stats have no byResourceType', () => {
    const { container } = render(
      <ResourceTypeBreakdownCard
        stats={[
          { label: 'Mobile', byResourceType: {} },
          { label: 'Desktop', byResourceType: {} },
        ]}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders when stats have byResourceType data', () => {
    const { container } = render(
      <ResourceTypeBreakdownCard
        stats={[
          {
            label: 'Mobile',
            byResourceType: {
              script: [
                { transferSize: 1000, resourceSize: 2000 },
              ],
            },
          },
        ]}
      />
    );
    expect(container.textContent).toContain('Resource Type Breakdown');
    expect(container.textContent).toContain('Script');
  });
});
