import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

function DebouncedInput({
  value: initialValue,
  onChange,
  debounce = 500,
  ...props
}: {
  value: string | number;
  onChange: (value: string | number) => void;
  debounce?: number;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  const [value, setValue] = React.useState(initialValue);
  const [syncedValue, setSyncedValue] = React.useState(initialValue);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  // Reset local state when the controlled value changes (render-time reset).
  if (initialValue !== syncedValue) {
    setSyncedValue(initialValue);
    setValue(initialValue);
  }

  // Cancel any pending emit on unmount.
  React.useEffect(() => () => clearTimeout(timeoutRef.current), []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => onChange(next), debounce);
  }

  return <Input {...props} value={value} onChange={handleChange} />;
}

DebouncedInput.displayName = "DebouncedInput";

export { Input, DebouncedInput };
