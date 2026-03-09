import { fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DebouncedInput, Input } from '@/components/ui/input';

describe('Input', () => {
  it('renders a standard input with forwarded props', () => {
    const { container } = render(
      <Input aria-label="URL" placeholder="https://example.com" type="url" />,
    );

    const input = container.querySelector('input[aria-label="URL"]');

    expect(input).toHaveAttribute('placeholder', 'https://example.com');
    expect(input).toHaveAttribute('type', 'url');
  });
});

describe('DebouncedInput', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits changes after the debounce interval', () => {
    const onChange = vi.fn();

    const { container } = render(
      <DebouncedInput
        aria-label="Search"
        value=""
        onChange={onChange}
        debounce={10}
      />,
    );

    const input = container.querySelector('input[aria-label="Search"]');
    fireEvent.change(input!, {
      target: { value: 'abc' },
    });

    expect(onChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(10);
    expect(onChange).toHaveBeenLastCalledWith('abc');
  });

  it('syncs its local value when the controlled prop changes', () => {
    const onChange = vi.fn();
    const { container, rerender } = render(
      <DebouncedInput aria-label="Search" value="first" onChange={onChange} />,
    );

    const input = container.querySelector('input[aria-label="Search"]');
    expect(input).toHaveValue('first');

    rerender(
      <DebouncedInput aria-label="Search" value="second" onChange={onChange} />,
    );

    expect(input).toHaveValue('second');
  });
});
