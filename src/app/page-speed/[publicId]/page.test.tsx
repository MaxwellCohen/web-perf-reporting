import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const useFetchPageSpeedDataByPublicIdMock = vi.fn();

vi.mock('@/components/page-speed/useFetchPageSpeedDataByPublicId', () => ({
  useFetchPageSpeedDataByPublicId: (publicId: string) =>
    useFetchPageSpeedDataByPublicIdMock(publicId),
}));

vi.mock('@/components/page-speed/pageSpeedInsightsDashboard', () => ({
  PageSpeedInsightsDashboard: ({
    data,
    labels,
  }: {
    data: unknown[];
    labels: string[];
  }) => (
    <div data-testid="page-speed-dashboard">
      Dashboard with {data.length} items, labels: {labels.join(', ')}
    </div>
  ),
}));

vi.mock('@/components/common/LoadingMessage', () => ({
  LoadingMessage: () => <div data-testid="loading-message">Loading</div>,
}));

vi.mock('@/components/common/ErrorMessage', () => ({
  ErrorMessage: () => <div data-testid="error-message">Error</div>,
}));

import PageSpeedPublicIdPage from './page';

describe('page-speed [publicId] page', () => {
  it('awaits params and renders wrapper with publicId', async () => {
    useFetchPageSpeedDataByPublicIdMock.mockReturnValue({
      data: [
        {
          lighthouseResult: { finalDisplayedUrl: 'https://example.com' },
          analysisUTCTimestamp: '2024-01-01T00:00:00.000Z',
        },
      ],
      isLoading: false,
    });

    const component = await PageSpeedPublicIdPage({
      params: Promise.resolve({ publicId: 'report-xyz-123' }),
    });

    const { container } = render(component);

    await waitFor(() => {
      expect(container.firstChild).toMatchSnapshot();
    });
    expect(useFetchPageSpeedDataByPublicIdMock).toHaveBeenCalledWith(
      'report-xyz-123',
    );
  });
});
