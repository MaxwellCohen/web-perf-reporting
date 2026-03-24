import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({
  unstable_cache: (fn: () => Promise<unknown>) => () => fn(),
}));

const getCurrentCruxDataMock = vi.fn();

vi.mock('@/lib/services', () => ({
  getCurrentCruxData: (...args: unknown[]) => getCurrentCruxDataMock(...args),
}));

vi.mock('@/components/latest-crux/PerformanceDashboard', () => ({
  CurrentPerformanceDashboard: ({
    reportMap,
  }: {
    reportMap: Record<string, unknown>;
  }) => (
    <div data-testid="dashboard">
      Dashboard with {Object.keys(reportMap).length} reports
    </div>
  ),
}));

import { CurrentPerformanceSection } from '@/components/latest-crux/CurrentPerformanceSection';

describe('CurrentPerformanceSection', () => {
  it('fetches crux data for origin and url with all form factors', async () => {
    getCurrentCruxDataMock.mockResolvedValue({ record: {} });

    const component = await CurrentPerformanceSection({
      url: 'https://example.com',
    });
    const { container } = render(component);

    expect(getCurrentCruxDataMock).toHaveBeenCalledTimes(8);
    expect(getCurrentCruxDataMock).toHaveBeenCalledWith({
      origin: 'https://example.com',
      formFactor: undefined,
    });
    expect(getCurrentCruxDataMock).toHaveBeenCalledWith({
      origin: 'https://example.com',
      formFactor: 'DESKTOP',
    });
    expect(getCurrentCruxDataMock).toHaveBeenCalledWith({
      url: 'https://example.com',
      formFactor: 'PHONE',
    });
    expect(container.querySelector('[data-testid="dashboard"]')).toBeTruthy();
  });

  it('passes report map to dashboard with correct structure', async () => {
    const report = { record: { collectionPeriod: {} } };
    getCurrentCruxDataMock.mockResolvedValue(report);

    const component = await CurrentPerformanceSection({
      url: 'https://test.com',
    });
    const { container } = render(component);

    expect(container.textContent).toContain('8 reports');
  });
});
