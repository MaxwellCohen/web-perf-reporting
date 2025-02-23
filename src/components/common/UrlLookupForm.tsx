'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import posthog from 'posthog-js';

export const UrlLookupForm = () => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    posthog.capture('Search for URL', {
      search_value: (e.target as any)?.url?.value,
    });
  };

  return (
    <>
      <h2 className="mx-auto text-center text-lg font-extrabold">
        {' '}
        please enter a url that you want a perf report on
      </h2>
      <form
        className="mx-auto flex max-w-[80ch] gap-3"
        method="GET"
        onSubmit={handleSubmit}
      >
        <Input
          className="min-w-[60]"
          type="text"
          placeholder="url"
          name="url"
        />
        <Button>Submit</Button>
      </form>
    </>
  );
};
