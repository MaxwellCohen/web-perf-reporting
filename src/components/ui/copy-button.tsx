'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CopyButtonProps extends ButtonProps {
  text: string;
  /** Reset delay in ms (default 2000). Use smaller values in tests. */
  resetDelay?: number;
}

export function CopyButton({
  text,
  className,
  variant = 'outline',
  size = 'icon',
  children,
  resetDelay = 2000,
  ...props
}: CopyButtonProps) {
  const [hasCopied, setHasCopied] = useState(false);

  const onCopy = (text: string) => {
    if (hasCopied) return;
    void (async () => {
      try {
        await navigator.clipboard.writeText(text);
        setHasCopied(true);
        await new Promise((resolve) => setTimeout(resolve, resetDelay));
        setHasCopied(false);
      } catch {
        // clipboard may be unavailable (non-secure context, permissions)
      }
    })();
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn('relative', className)}
      onClick={() => onCopy(text)}
      {...props}
    >
      {hasCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {children}
      <span className="sr-only">Copy</span>
    </Button>
  );
}
