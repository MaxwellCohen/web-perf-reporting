'use client';
import { PageSpeedInsightsDashboard } from '@/components/page-speed/pageSpeedInsightsDashboard';
import { NullablePageSpeedInsights, PageSpeedInsights } from '@/lib/schema';
import { useRef, useState } from 'react';
import { Details } from '../ui/accordion';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';

export default function ViewerPage() {
  const [data, updateData] = useState<NullablePageSpeedInsights[]>([null]);
  const textRef = useRef<HTMLTextAreaElement>(null);
  return (
    <>
      <Details>
        <summary className="flex flex-col gap-2">
          <div className="text-lg font-bold">
            Enter the lighthouse JSON Data here
          </div>
        </summary>
        <Textarea ref={textRef} />
        <Button
          className="mt-4"
          type="button"
          onClick={() => {
            if (textRef.current) {
              try {
                const data = JSON.parse(
                  textRef.current.value,
                ) as PageSpeedInsights;
                updateData([data]);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
              } catch (_e) {
                alert('Invalid JSON');
                updateData([null]);
                return;
              }
            }
          }}
        >
          Show Report
        </Button>
      </Details>
      <PageSpeedInsightsDashboard data={data} labels={[]} hideReport />
    </>
  );
}
