"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useId } from "react";

export const UrlLookupForm = () => {
  const id = useId();
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // Dynamic import keeps posthog-js out of the initial client bundle.
    // Analytics is fire-and-forget; failures must not break form submit.
    const searchValue = (e.target as HTMLFormElement & { url?: { value?: string } })?.url
      ?.value;
    void import("posthog-js").then(({ default: posthog }) => {
      posthog.capture("Search for URL", {
        search_value: searchValue,
      });
    });
  };

  return (
    <div className="mx-auto flex flex-col max-w-[80ch] gap-3">
      <label htmlFor={`url-${id}`} className="w-full">
        Enter an url:
      </label>
      <form className="mx-auto flex w-full max-w-[80ch] gap-3" method="GET" onSubmit={handleSubmit}>
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
