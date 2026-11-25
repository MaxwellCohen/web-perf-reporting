"use client";
/* eslint-disable @next/next/no-img-element */

import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Dialog sizing shared by every full-screen screenshot view. */
export const FULLSCREEN_DIALOG_CLASS =
  "flex h-[95dvh] w-[96vw] max-w-[96vw] flex-col gap-3 p-3 sm:p-5";

/** Cursor and hover cue for anything that opens a full-screen screenshot. */
export const ZOOM_TRIGGER_CLASS =
  "cursor-zoom-in transition hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** The image, scaled to fit the full-screen dialog. */
export function FullscreenImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border bg-muted/40 p-2">
      <img
        src={src}
        alt={alt}
        className="size-full object-contain"
        decoding="async"
      />
    </div>
  );
}

/**
 * A screenshot thumbnail that opens full screen on click.
 * `children` replaces the default thumbnail when the caller needs its own layout.
 */
export function ZoomableImage({
  src,
  alt,
  title,
  className,
  imageClassName,
  children,
}: {
  src: string;
  alt: string;
  /** Dialog heading. */
  title: string;
  /** Classes for the trigger button. */
  className?: string;
  /** Classes for the default thumbnail image. */
  imageClassName?: string;
  children?: ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Open full screen: ${alt}`}
          className={cn(ZOOM_TRIGGER_CLASS, className)}
        >
          {children ?? (
            <img src={src} alt={alt} loading="lazy" decoding="async" className={imageClassName} />
          )}
        </button>
      </DialogTrigger>
      <DialogContent className={FULLSCREEN_DIALOG_CLASS}>
        <DialogTitle className="pr-8 text-base sm:text-lg">{title}</DialogTitle>
        <FullscreenImage src={src} alt={alt} />
      </DialogContent>
    </Dialog>
  );
}
