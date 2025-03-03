/* eslint-disable @next/next/no-img-element */
import { AuditDetailFilmstrip } from '@/lib/schema';

interface TimelineProps {
  timeline?: AuditDetailFilmstrip;
}

export function Timeline({ timeline }: TimelineProps) {
  if (!timeline?.items?.length) return null;

  return (
    <div className="mt-3 flex flex-col">
      <h3 className="text-lg font-bold">Timeline</h3>
      <div className="mt-3 flex flex-row gap-2 align-top">
        {timeline.items.map((item, i) => (
          <div key={`${i}-${item.timestamp}`} className="border">
            <img alt="timeline image" width={80} src={item.data} />
            <div>{item.timing} ms</div>
          </div>
        ))}
      </div>
    </div>
  );
} 