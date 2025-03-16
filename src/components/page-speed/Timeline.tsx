'use client';
/* eslint-disable @next/next/no-img-element */
import { AuditDetailFilmstrip } from '@/lib/schema';
import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Carousel,
  CarouselApi,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '../ui/carousel';
import { CarouselContent } from '../ui/carousel';
import { Details } from '../ui/accordion';

interface TimelineProps {
  timeline?: AuditDetailFilmstrip;
  device?: string;
}

export function Timeline({ timeline, device }: TimelineProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

    useEffect(() => {
        if (api && openIndex !== null) {
            api.scrollTo(openIndex);
        }
    }, [api, openIndex]);

  if (!timeline?.items?.length) return null;

  return (
    <Details className="mt-3 flex flex-col">
      <summary className="flex flex-col gap-2 overflow-auto">
        <h3 className="text-lg font-bold">{device ? `${device} - ` : ''} Timeline</h3>
      </summary>
      <Dialog>
        <div className="mt-3 flex flex-row gap-2 align-top">
          {timeline.items.map((item, i) => (
            <DialogTrigger asChild key={`${i}-${item.timestamp}`}>
              <div>
                <button
                  className="rounded-md border-2  p-2 hover:scale-105 z-0"
                  onClick={() => setOpenIndex(i)}
                >
                  <img alt={`timeline image at ${item.timing}`} width={80} src={item.data} />
                  <div>{item.timing} ms</div>
                </button>
              </div>
            </DialogTrigger>
          ))}
          <DialogContent className="h-full w-screen md:w-[74vw] max-w-none">
            <DialogTitle>Timeline</DialogTitle>
            <Carousel setApi={setApi} >
              <CarouselContent className="w-3/4">
                {timeline.items.map((item, i) => (
                  <CarouselItem
                    onClick={() => setTimeout(()=> api?.scrollTo(i + 3), 100)}
                    key={`${i}-${item.timestamp}`}
                    className="basis-1/2"
                  >
                    <div className='flex flex-col gap-2 justify-center'>
                      <img className="max-w-full h-full max-h-[75vh] object-contain" alt={`timeline image at ${item.timing}`} width={500} src={item.data} />
                      <div className='text-center'>{item.timing} ms</div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
            <DialogClose asChild>
              <Button className="w-17" autoFocus>close</Button>
            </DialogClose>
          </DialogContent>
        </div>
      </Dialog>
    </Details>
  );
}
