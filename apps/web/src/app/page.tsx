import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { getSiteUrl } from "@/lib/siteUrl";
import type { Route } from "next";
import Link from "next/link";

const tools: { title: string; description: string; url: Route }[] = [
  {
    title: "Latest CrUX",
    description: "Core Web Vitals from real Chrome users",
    url: "/latest-crux",
  },
  {
    title: "Historical trends",
    description: "How your metrics change over time",
    url: "/historical-crux",
  },
  {
    title: "PageSpeed Insights",
    description: "Lab audits and recommendations",
    url: "/page-speed",
  },
  {
    title: "Lighthouse viewer",
    description: "Inspect reports from your experiments",
    url: "/viewer",
  },
];

export default function Home() {
  const agentPrompt = `Read ${getSiteUrl()}/llms.txt and follow it to find performance improvements for this project. First ask me what to test: a local production build of this repo, the staging environment, or live production. Then run Lighthouse against that target (never the dev server), POST the results for analysis, then work through the speed-up prompt it returns, fixing one focus area at a time and re-measuring after each change.`;

  return (
    <div className="container mx-auto px-4 py-12">
      <section className="text-center mb-16">
        <span className="inline-block rounded-full border px-3 py-1 text-xs text-muted-foreground mb-4">
          Works with Claude Code · Codex · Cursor
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          Let your agent make your site fast
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Paste one prompt. Your agent runs Lighthouse, gets an analysis, and fixes issues one focus
          area at a time. No API key needed, and localhost works.
        </p>
        <div className="max-w-3xl mx-auto flex items-start gap-2 rounded-lg border bg-muted/50 p-3 text-left">
          <pre className="flex-1 whitespace-pre-wrap font-mono text-sm">{agentPrompt}</pre>
          <CopyButton text={agentPrompt} aria-label="Copy agent prompt" />
        </div>
      </section>

      <section>
        <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Or explore the data yourself
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tools.map((tool) => (
            <Button
              key={tool.url}
              asChild
              variant="outline"
              className="h-auto flex-col items-start gap-1 whitespace-normal p-4 text-left no-underline"
            >
              <Link href={tool.url}>
                <span className="font-semibold">{tool.title} →</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {tool.description}
                </span>
              </Link>
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}
