import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageSpeedInsightsDashboardWrapper } from './PageSpeedInsightsDashboardWrapper';

const usePageSpeedInsightsQueryMock = vi.fn();

vi.mock('@/features/page-speed-insights/data/usePageSpeedInsightsQuery', () => ({
  usePageSpeedInsightsQuery: (source: { mode: string; publicId?: string }) =>
    usePageSpeedInsightsQueryMock(source),
}));

vi.mock('@/features/page-speed-insights/pageSpeedInsightsDashboard', () => ({
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
  ErrorMessage: ({
    title,
    description,
    retryUrl,
  }: {
    title: string;
    description: string;
    retryUrl: string;
  }) => (
    <div data-testid="error-message">
      <span data-testid="error-title">{title}</span>
      <span data-testid="error-description">{description}</span>
      <span data-testid="error-retry-url">{retryUrl}</span>
    </div>
  ),
}));

const createMockPageSpeedData = () => [
  {
    lighthouseResult: { finalDisplayedUrl: 'https://example.com' },
    analysisUTCTimestamp: '2024-01-01T00:00:00.000Z',
  },
];

describe('PageSpeedInsightsDashboardWrapper', () => {
  it('passes publicId to usePageSpeedInsightsQuery', () => {
    usePageSpeedInsightsQueryMock.mockReturnValue({
      data: [],
      isLoading: true,
    });

    render(<PageSpeedInsightsDashboardWrapper publicId="test-id-123" />);

    expect(usePageSpeedInsightsQueryMock).toHaveBeenCalledWith({
      mode: 'publicId',
      publicId: 'test-id-123',
    });
  });

  it('shows loading when isLoading is true', async () => {
    usePageSpeedInsightsQueryMock.mockReturnValue({
      data: [],
      isLoading: true,
    });

    const { container } = render(
      <PageSpeedInsightsDashboardWrapper publicId="test-id" />,
    );

    await waitFor(() => {
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  it('shows loading when data is empty or has no truthy items', async () => {
    usePageSpeedInsightsQueryMock.mockReturnValue({
      data: [],
      isLoading: false,
    });

    const { container } = render(
      <PageSpeedInsightsDashboardWrapper publicId="test-id" />,
    );

    await waitFor(() => {
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  it('shows loading when data has only null/undefined items', async () => {
    usePageSpeedInsightsQueryMock.mockReturnValue({
      data: [null, undefined],
      isLoading: false,
    });

    const { container } = render(
      <PageSpeedInsightsDashboardWrapper publicId="test-id" />,
    );

    await waitFor(() => {
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  it('shows error when data is not an array', async () => {
    usePageSpeedInsightsQueryMock.mockReturnValue({
      data: { status: 'failed' },
      isLoading: false,
    });

    const { container } = render(
      <PageSpeedInsightsDashboardWrapper publicId="test-id" />,
    );

    await waitFor(() => {
      expect(container.firstChild).toMatchSnapshot();
    });
    expect(screen.getByTestId('error-title')).toHaveTextContent(
      'Failed to Load Report',
    );
    expect(screen.getByTestId('error-retry-url')).toHaveTextContent('/page-speed');
  });

  it('renders dashboard when client-side with valid data', async () => {
    const mockData = createMockPageSpeedData();
    usePageSpeedInsightsQueryMock.mockReturnValue({
      data: mockData,
      isLoading: false,
    });

    const { container } = render(
      <PageSpeedInsightsDashboardWrapper publicId="test-id" />,
    );

    await waitFor(() => {
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
