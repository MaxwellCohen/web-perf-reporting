'use client';
/* eslint-disable @next/next/no-img-element */
import { AuditDetailFilmstrip } from '@/lib/schema';
import { useState } from 'react';
import { Button } from '../ui/button';

interface TimelineProps {
  timeline?: AuditDetailFilmstrip;
}

export function Timeline({ timeline }: TimelineProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  if (!timeline?.items?.length) return null;

  return (
    <div className="mt-3 flex flex-col">
      <h3 className="text-lg font-bold">Timeline</h3>
      <div className="mt-3 flex flex-row gap-2 align-top">
        {timeline.items.map((item, i) => (
          <>
            <button
              key={`${i}-${item.timestamp}`}
              className="rounded-md border-2 border-gray-300"
              onClick={() => setOpenIndex(i)}
            >
              <img alt="timeline image" width={80} src={item.data} />
              <div>{item.timing} ms</div>
            </button>
            <dialog className="absolute top-0 left-0" open={openIndex === i}>
              <img alt="timeline image" width={500} src={item.data} />
              <form method="dialog">
                <Button autoFocus  onClick={() => setOpenIndex(null)}>
                  close
                </Button>
              </form>
            </dialog>
          </>
        ))}
      </div>
    </div>
  );
}
