import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  getAlert,
  getButton,
  submitForm,
} from './__mocks__/input-form-mocks';
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

describe('LhInputForm', () => {
  describe('form action wiring', () => {
    it('form has id lh-input-form', () => {
      const { container } = render(<LhInputForm />);
      const form = container.querySelector('#lh-input-form');
      expect(form).toBeInTheDocument();
    });

    it('submit button is associated with form via form attribute', () => {
      const { container } = render(<LhInputForm />);
      const button = container.querySelector('button[type="submit"]');
      expect(button).toHaveAttribute('form', 'lh-input-form');
    });

    it('submit button shows Submit when not pending', () => {
      const { container } = render(<LhInputForm />);
      const button = container.querySelector('button[type="submit"]');
      expect(button).toHaveTextContent('Submit');
    });
  });

  it('renders card with title, description, tabs and submit button', () => {
    const { container } = render(<LhInputForm />);
    expect(container.textContent).toContain('Lighthouse Report Viewer');
    expect(container.firstChild).toMatchSnapshot();
  });

  it('shows JSON Entries section and add-entry button on text tab', () => {
    const { container } = render(<LhInputForm />);
    expect(container.textContent).toContain('JSON Entries');
    expect(container.firstChild).toMatchSnapshot();
  });

  describe('text tab submit validation', () => {
    it('displays error from form action', async () => {
      vi.mocked(executeSubmit).mockResolvedValueOnce({
        error: 'All JSON entries must have a name',
        success: false,
      });
      const { container } = render(<LhInputForm />);
      fireEvent.change(container.querySelector('input[id^="json-name"]')!, {
        target: { value: '  ' },
      });
      submitForm();
      await act(async () => {});

      expect(getAlert(container)).toHaveTextContent(
        'All JSON entries must have a name',
      );
    });

    it('displays success from form action', async () => {
      vi.mocked(executeSubmit).mockResolvedValueOnce({
        error: null,
        success: true,
      });
      const { container } = render(<LhInputForm />);
      fireEvent.change(container.querySelector('input[id^="json-name"]')!, {
        target: { value: 'Report1' },
      });
      const contentArea = container.querySelector(
        'textarea[placeholder*="Paste"]',
      ) as HTMLTextAreaElement;
      fireEvent.change(contentArea, { target: { value: '{"score": 90}' } });
      submitForm();
      await act(async () => {});

      expect(getAlert(container)).toHaveTextContent('Success');
      expect(container.textContent).toMatch(
        /JSON data has been successfully processed/,
      );
    });
  });

  describe('text tab interactions', () => {
    it('adds another JSON entry', () => {
      const { container } = render(<LhInputForm />);

      fireEvent.click(getButton(container, 'Add Another JSON Entry')!);

      const nameInputs = container.querySelectorAll(
        'input[placeholder="Entry name"]',
      );
      expect(nameInputs).toHaveLength(2);
    });

    it('updates name and content and can remove entry', () => {
      const { container } = render(<LhInputForm />);

      fireEvent.change(
        container.querySelector('input[placeholder="Entry name"]')!,
        { target: { value: 'First' } },
      );
      const contentAreas = container.querySelectorAll(
        'textarea[placeholder*="Paste"]',
      );
      fireEvent.change(contentAreas[0] as HTMLTextAreaElement, {
        target: { value: '{}' },
      });

      expect(
        (
          container.querySelector(
            'input[placeholder="Entry name"]',
          ) as HTMLInputElement
        ).value,
      ).toBe('First');
      expect((contentAreas[0] as HTMLTextAreaElement).value).toBe('{}');

      fireEvent.click(getButton(container, 'Remove')!);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
