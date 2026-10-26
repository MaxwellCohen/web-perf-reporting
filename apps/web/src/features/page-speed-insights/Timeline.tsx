"use client";
/* eslint-disable @next/next/no-img-element */
import { AuditDetailFilmstrip } from "@/lib/schema";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselApi,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { CarouselContent } from "@/components/ui/carousel";
import {
  labelsByFrameIndex,
  type FilmstripMarker,
} from "@/features/page-speed-insights/shared/filmstripMarkers";

interface TimelineProps {
  timeline?: AuditDetailFilmstrip;
  device?: string;
  markers?: FilmstripMarker[];
}

function FrameLabels({ labels }: { labels: string[] }) {
  if (!labels.length) return null;
  return (
    <div className="mt-0.5 text-center text-[10px] font-medium uppercase tracking-wide text-foreground">
      {labels.join(" · ")}
    </div>
  );
}

export function Timeline({ timeline, device, markers = [] }: TimelineProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const frameLabels = useMemo(
    () => labelsByFrameIndex(timeline?.items ?? [], markers),
    [timeline?.items, markers],
  );

  useEffect(() => {
    if (api && openIndex !== null) {
      api.scrollTo(openIndex);
    }
  }, [api, openIndex]);

  if (!timeline?.items?.length) return null;

  return (
    <div className="px-4">
      <h3 className="text-lg font-bold">{device ? `${device} - ` : ""} Timeline</h3>
      <Dialog>
        <div className="mt-3 flex flex-row gap-2 align-top overflow-x-auto pb-2">
          {timeline.items.map((item, i) => (
            <DialogTrigger asChild key={`${i}-${item.timestamp}`}>
              <div className="shrink-0">
                <button
                  className="rounded-md border-2  p-2 hover:scale-105 z-0"
                  onClick={() => setOpenIndex(i)}
                >
                  <img
                    alt={`timeline image at ${item.timing}`}
                    width={80}
                    loading="lazy"
                    decoding="async"
                    src={item.data}
                  />
                  <div>{item.timing} ms</div>
                  <FrameLabels labels={frameLabels[i] ?? []} />
                </button>
              </div>
            </DialogTrigger>
          ))}
          <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-5xl flex-col gap-4 overflow-y-auto sm:w-[90vw] md:w-[74vw]">
            <DialogTitle>Timeline</DialogTitle>
            <Carousel setApi={setApi} className="w-full px-10 sm:px-12">
              <CarouselContent>
                {timeline.items.map((item, i) => (
                  <CarouselItem
                    onClick={() => setTimeout(() => api?.scrollTo(i + 3), 100)}
                    key={`${i}-${item.timestamp}`}
                    className="basis-full sm:basis-1/2"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <img
                        className="h-auto max-h-[min(60vh,calc(90dvh-12rem))] w-full object-contain"
                        alt={`timeline image at ${item.timing}`}
                        loading="lazy"
                        decoding="async"
                        src={item.data}
                      />
                      <div className="text-center text-sm sm:text-base">{item.timing} ms</div>
                      <FrameLabels labels={frameLabels[i] ?? []} />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-0" />
              <CarouselNext className="right-0" />
            </Carousel>
            <DialogClose asChild>
              <Button className="w-17 shrink-0" autoFocus>
                close
              </Button>
            </DialogClose>
          </DialogContent>
        </div>
      </Dialog>
    </div>
  );
}
