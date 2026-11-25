"use client";
import { useState, useSyncExternalStore } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FULLSCREEN_DIALOG_CLASS } from "@/features/page-speed-insights/shared/ZoomableImage";
import {
  RenderThumbnails,
  type ElementScreenshotRendererProps,
} from "@/features/page-speed-insights/lh-categories/table/ElementScreenshotThumbnails";

const subscribeNoop = () => () => {};

/**
 * ElementScreenshotRenderer component without overlay functionality
 */
export function ElementScreenshotRenderer({
  screenshot,
  elementRects = [],
  maxThumbnailSize = { width: 120, height: 80 },
}: ElementScreenshotRendererProps) {
  const [dialogEl, setDialogEl] = useState<HTMLDivElement | null>(null);
  const isClient = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  if (!screenshot) return null;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex cursor-zoom-in items-center justify-center hover:scale-110 hover:shadow-md">
          {isClient ? (
            <RenderThumbnails
              maxThumbnailSize={maxThumbnailSize}
              elementRects={elementRects}
              screenshot={screenshot}
            />
          ) : null}
        </div>
      </DialogTrigger>
      <DialogContent className={FULLSCREEN_DIALOG_CLASS}>
        <DialogTitle className="pr-8 text-base sm:text-lg">Screenshot</DialogTitle>
        <div
          ref={setDialogEl}
          className="flex min-h-0 flex-1 items-center justify-center overflow-hidden"
        >
          {isClient ? (
            <RenderThumbnails
              maxThumbnailSize={{
                width: dialogEl?.clientWidth || 500,
                height: dialogEl?.clientHeight || 500,
              }}
              screenshot={screenshot}
              elementRects={elementRects}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
