'use client';
import { Textarea } from '@/components/ui/textarea';
import { Details } from '@/components/ui/accordion';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { PageSpeedInsights } from '@/lib/schema';

export function JSONTextArea({
  data,
  onUpdate,
}: {
  data: (PageSpeedInsights)[];
  onUpdate: (data: (PageSpeedInsights)[]) => void;
}) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  let initialData = '';
  if (data[0]) {
    initialData = JSON.stringify(data[0], null, 2);
  }

  return (
    <Details>
      <summary>Enter the lighthouse JSON Data here</summary>
      <Textarea ref={textRef} value={initialData} readOnly />
      <Button
        className='mt-4'
        type='button'
        onClick={() => {
          if (textRef.current) {
            try {
              const data = JSON.parse(textRef.current.value) as PageSpeedInsights;
              onUpdate([data]);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (_e) {
              alert('Invalid JSON');
              return;
            }
          }
        }}>
            Show Report
        </Button>
    </Details>
  );
}
