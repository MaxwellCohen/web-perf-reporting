'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import posthog from 'posthog-js';
import { useId } from 'react';

export const UrlLookupForm = () => {
  const id = useId();
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    posthog.capture('Search for URL', {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      search_value: (e.target as any)?.url?.value,
    });
  };

  return (
  
      <div className="mx-auto flex flex-col max-w-[80ch] gap-3">
      <label htmlFor={`url-${id}`} className="w-full">
        Enter an url: 
      </label>
      <form
        className="mx-auto flex w-full max-w-[80ch] gap-3"
        method="GET"
        onSubmit={handleSubmit}
      >
        <Input
          id={`url-${id}`}
          className="min-w-[60]"
          type="url"
          name="url"
          placeholder="https://example.com"
        />
        <Button>Submit</Button>
      </form>
    </div>
  );
};
