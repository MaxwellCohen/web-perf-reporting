import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAlert, getTab, submitForm } from './__mocks__/input-form-mocks';
import { executeSubmit } from '@/components/lh/input-form-action';
import { LhInputForm } from '@/components/lh/input-form';

vi.mock('@/components/lh/input-form-action', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/components/lh/input-form-action')>();
  return {
    ...actual,
    executeSubmit: vi.fn().mockResolvedValue({ error: null, success: false }),
  };
});

vi.mock('@/components/ui/tabs', () =>
  import('./__mocks__/input-form-mocks').then((m) => m.tabsMock)
);
vi.mock('lucide-react', () =>
  import('./__mocks__/input-form-mocks').then((m) => m.lucideMock)
);
vi.mock('@/components/ui/card', () =>
  import('./__mocks__/input-form-mocks').then((m) => m.cardMock)
);
vi.mock('@/components/ui/input', () =>
  import('./__mocks__/input-form-mocks').then((m) => m.inputMock)
);
vi.mock('@/components/ui/textarea', () =>
  import('./__mocks__/input-form-mocks').then((m) => m.textareaMock)
);
vi.mock('@/components/ui/button', () =>
  import('./__mocks__/input-form-mocks').then((m) => m.buttonMock)
);
vi.mock('@/components/ui/label', () =>
  import('./__mocks__/input-form-mocks').then((m) => m.labelMock)
);
vi.mock('@/components/ui/alert', () =>
  import('./__mocks__/input-form-mocks').then((m) => m.alertMock)
);
vi.mock('@/components/lh/LhTabList', () =>
  import('./__mocks__/input-form-mocks').then((m) => m.lhTabListMock)
);
vi.mock('@/components/lh/LhTextInput', () =>
  import('./__mocks__/input-form-mocks').then((m) => m.lhTextInputMock)
);
vi.mock('@/components/lh/LhFileInput', () =>
  import('./__mocks__/input-form-mocks').then((m) => m.lhFileInputMock)
);
vi.mock('@/components/lh/LhUrlInput', () =>
  import('./__mocks__/input-form-mocks').then((m) => m.lhUrlInputMock)
);

async function switchToUrlTab(container: HTMLElement) {
  const urlTab = getTab(container, /Fetch via PageSpeed Insights API/);
  await act(async () => {
    fireEvent.click(urlTab!);
  });
}

describe('LhInputForm url tab', () => {
  beforeEach(() => {
    vi.mocked(executeSubmit).mockReset();
    vi.mocked(executeSubmit).mockResolvedValue({
      error: null,
      success: false,
    });
  });

  it('shows error when URL is empty', async () => {
    vi.mocked(executeSubmit).mockResolvedValueOnce({
      error: 'Please enter a URL',
      success: false,
    });
    const { container } = render(<LhInputForm />);
    await switchToUrlTab(container);
    submitForm();
    await waitFor(() => {
      expect(getAlert(container)).toHaveTextContent('Please enter a URL');
    });
  });

  it('shows success when URL returns valid JSON', async () => {
    vi.mocked(executeSubmit).mockResolvedValueOnce({ error: null, success: true });
    const { container } = render(<LhInputForm />);
    await switchToUrlTab(container);
    fireEvent.change(container.querySelector('#json-url')!, {
      target: { value: 'https://api.example.com/data.json' },
    });
    submitForm();
    await waitFor(() => {
      expect(getAlert(container)).toHaveTextContent('Success');
    });
    expect(executeSubmit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ jsonUrl: 'https://api.example.com/data.json' }),
      expect.any(Function),
    );
  });

  it('shows Processing and disables button during async submission', async () => {
    let resolveAction: () => void;
    const actionPromise = new Promise<{ error: null; success: boolean }>(
      (resolve) => {
        resolveAction = () => resolve({ error: null, success: true });
      },
    );
    vi.mocked(executeSubmit).mockReturnValue(actionPromise);
    const { container } = render(<LhInputForm />);
    await switchToUrlTab(container);
    fireEvent.change(container.querySelector('#json-url')!, {
      target: { value: 'https://example.com/data.json' },
    });
    submitForm();
    await act(async () => {});
    const button = container.querySelector('button[type="submit"]');
    expect(button).toHaveTextContent('Processing...');
    expect(button).toBeDisabled();
    resolveAction!();
    await act(async () => {});
    expect(button).toHaveTextContent('Submit');
    expect(button).not.toBeDisabled();
  });

  it('updates URL input when typing in url tab', async () => {
    const { container } = render(<LhInputForm />);
    await switchToUrlTab(container);
    const urlInput = container.querySelector('#json-url') as HTMLInputElement;
    fireEvent.change(urlInput, { target: { value: 'https://test.com' } });
    expect(urlInput).toHaveValue('https://test.com');
  });
});
