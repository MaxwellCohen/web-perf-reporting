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

describe('LhInputForm file tab', () => {
  beforeEach(() => {
    vi.mocked(executeSubmit).mockReset();
    vi.mocked(executeSubmit).mockResolvedValue({
      error: null,
      success: false,
    });
  });

  it('shows error when submitting with no files selected', async () => {
    vi.mocked(executeSubmit).mockResolvedValueOnce({
      error: 'Please select at least one JSON file',
      success: false,
    });
    const { container } = render(<LhInputForm />);
    const fileTab = getTab(container, /Upload Lighthouse JSON File/);
    await act(async () => {
      fireEvent.click(fileTab!);
    });
    submitForm();
    await waitFor(() => {
      expect(getAlert(container)).toHaveTextContent(
        'Please select at least one JSON file',
      );
    });
  });

  it('shows success when file has valid JSON and name', async () => {
    vi.mocked(executeSubmit).mockResolvedValueOnce({
      error: null,
      success: true,
    });
    const { container } = render(<LhInputForm />);
    const fileTab = getTab(container, /Upload Lighthouse JSON File/);
    await act(async () => {
      fireEvent.click(fileTab!);
    });
    const file = new File(['{"score": 85}'], 'report.json', {
      type: 'application/json',
    });
    fireEvent.change(container.querySelector('#json-file')!, {
      target: { files: [file] },
    });
    fireEvent.change(
      container.querySelector('input[placeholder="Enter a name for this file"]')!,
      { target: { value: 'MyFile' } },
    );
    submitForm();
    await waitFor(() => {
      expect(getAlert(container)).toHaveTextContent('Success');
    });
  });

  it('ignores file input change when no files selected', async () => {
    const { container } = render(<LhInputForm />);
    const fileTab = getTab(container, /Upload Lighthouse JSON File/);
    await act(async () => {
      fireEvent.click(fileTab!);
    });
    fireEvent.change(container.querySelector('#json-file')!, {
      target: { files: [] },
    });
    expect(container.firstChild).toMatchSnapshot();
  });

  it('allows updating file name and removing file', async () => {
    const { container } = render(<LhInputForm />);
    const fileTab = getTab(container, /Upload Lighthouse JSON File/);
    await act(async () => {
      fireEvent.click(fileTab!);
    });
    const file = new File(['{}'], 'a.json', { type: 'application/json' });
    fireEvent.change(container.querySelector('#json-file')!, {
      target: { files: [file] },
    });
    const nameInput = container.querySelector(
      'input[placeholder="Enter a name for this file"]',
    ) as HTMLInputElement;
    fireEvent.change(nameInput!, { target: { value: 'CustomName' } });
    expect(nameInput).toHaveValue('CustomName');
    const removeButtons = Array.from(
      container.querySelectorAll('button'),
    ).filter((b) => b.textContent?.trim() === 'Remove');
    fireEvent.click(removeButtons[removeButtons.length - 1]!);
    await act(async () => {});
    expect(
      container.querySelector('input[placeholder="Enter a name for this file"]'),
    ).toBeNull();
  });
});
