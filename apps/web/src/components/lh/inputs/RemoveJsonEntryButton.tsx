"use client";

import { Button } from "@/components/ui/button";

type RemoveJsonEntryButtonProps = {
  onRemove: () => void;
};

export function RemoveJsonEntryButton({ onRemove }: RemoveJsonEntryButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="absolute right-2 top-2"
      onClick={onRemove}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
      <span className="sr-only">Remove</span>
    </Button>
  );
}
