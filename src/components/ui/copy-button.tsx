"use client"

import * as React from "react"
import { Check, Copy } from "lucide-react"

import { Button, ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CopyButtonProps extends ButtonProps {
  text: string
}

export function CopyButton({
  text,
  className,
  variant = "outline",
  size = "icon",
  children,
  ...props
}: CopyButtonProps) {
  const [hasCopied, setHasCopied] = React.useState(false)

  React.useEffect(() => {
    if (hasCopied) {
      const timeout = setTimeout(() => {
        setHasCopied(false)
      }, 2000)
      return () => clearTimeout(timeout)
    }
  }, [hasCopied])

  const onCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setHasCopied(true)
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("relative", className)}
      onClick={() => onCopy(text)}
      {...props}
    >
      {hasCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {children}
      <span className="sr-only">Copy</span>
    </Button>
  )
}
