import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/page-speed/pageSpeedInsightsDashboard', () => ({
  PageSpeedInsightsDashboard: ({ data }: { data: unknown[] }) => (
    <div data-testid="dashboard">{data.length} reports</div>
  ),
}));

vi.mock('lighthouse/report/renderer/text-encoding', () => ({
  TextEncoding: {
    fromBase64: (data: string) => data,
  },
}));

vi.mock('pako', () => ({
  default: {},
}));

const mockAlert = vi.fn();

import ViewerPage from '@/components/viewer/ViewerPage';

describe('ViewerPage', () => {
  beforeEach(() => {
    window.alert = mockAlert;
    window.location.hash = '';
  });

  it('renders input form when no data', () => {
    const { container } = render(<ViewerPage />);
    expect(container.textContent).toContain('Enter the lighthouse JSON Data here');
    expect(container.querySelector('textarea')).toBeTruthy();
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('shows dashboard when valid JSON submitted', async () => {
    const { container } = render(<ViewerPage />);
    const textarea = container.querySelector('textarea')!;
    const button = container.querySelector('button')!;

    fireEvent.change(textarea, {
      target: { value: JSON.stringify({ lighthouseResult: { categories: {} } }) },
    });
    fireEvent.click(button);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    await waitFor(() => {
      expect(container.querySelector('[data-testid="dashboard"]')).toBeTruthy();
    });
  });

  it('shows alert when invalid JSON submitted', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(<ViewerPage />);
    const textarea = container.querySelector('textarea')!;
    const button = container.querySelector('button')!;

    fireEvent.change(textarea, { target: { value: 'invalid json' } });
    fireEvent.click(button);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Invalid JSON');
    });
    consoleErrorSpy.mockRestore();
  });
});
