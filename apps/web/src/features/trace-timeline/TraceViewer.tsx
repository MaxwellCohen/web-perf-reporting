"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseTrace, summarizeTrace, type ParsedTrace } from "./parseTrace";
import { analyzeLoad } from "./analyzeLoad";
import { loadTrace } from "./loadTrace";
import { TraceTimeline } from "./TraceTimeline";
import { TraceLoadTimeline } from "./TraceLoadTimeline";
import { KeyEventsPanel, FixPrompt } from "./KeyEventsPanel";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/cn";
import { buttonVariants } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { buildFixPrompt } from "./fixPrompt";

function fullSummary(t: ParsedTrace) {
  const { ttfb, fcp, lcp, cls, blockingMs } = analyzeLoad(t);
  return { ...summarizeTrace(t), metrics: { ttfb, fcp, lcp, cls, blockingMs } };
}

function AgentPrompt() {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const prompt = `Analyze a Chrome performance trace with the timeline viewer at ${origin}/trace.

Load
1. Get the trace to a URL the browser can fetch: same-origin (e.g. copy it into apps/web/public/ and serve it) or CORS-enabled. .json and .json.gz both work; local file paths do not.
2. Open ${origin}/trace?src=<encoded-trace-url>. (On an already-open /trace page: await window.__trace.load(url).)
3. Poll window.__trace.summary() with preview_evaluate until it is non-null (max 30s; the same JSON is in #trace-summary). If still null, read the on-page error, report it, and stop. Never guess numbers.

Read (times are ms since navigation start)
- summary.metrics: ttfb, fcp, lcp, cls, blockingMs (undefined = not in the trace; report "n/a")
- longTasks[] (>=50ms: startMs, durMs): give the count and total
- lcpCandidates[]: the last one is the LCP element (node, size)
- topSlices[] (name, startMs, durMs) and mainThreadMsByCategory
- layoutShifts[], markers[], navigation.url (the page analysed); hasCpuProfile says whether function-level attribution exists

Report
- A table: TTFB / FCP / LCP / CLS / long-task count + total, with the page URL
- The 3 biggest problems, each tied to evidence (a long task, slice or the LCP node) and a likely cause
- Which navigation the summary covers, if the trace holds several
- A screenshot of the full timeline`;
  return (
    <div className="mx-auto flex max-w-3xl items-start gap-2 rounded-lg border bg-muted/50 p-3 text-left">
      <pre className="max-h-[350px] flex-1 overflow-y-auto whitespace-pre-wrap font-mono text-sm">{prompt}</pre>
      <CopyButton text={prompt} aria-label="Copy agent prompt" />
    </div>
  );
}

export function TraceViewer() {
  const [trace, setTrace] = useState<ParsedTrace | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);

  const traceRef = useRef<ParsedTrace | null>(null);

  const load = useCallback(async (input?: File | string | object) => {
    if (!input) return;
    setBusy(true);
    setError("");
    try {
      let parsed: ParsedTrace;
      if (input instanceof File || typeof input === "string") {
        setProgress(0);
        parsed = await loadTrace(input, setProgress);
      } else {
        parsed = parseTrace(input);
      }
      traceRef.current = parsed;
      setTrace(parsed);
      return summarizeTrace(parsed);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to read trace";
      setError(msg);
      throw e;
    } finally {
      setBusy(false);
    }
  }, []);

  // Agent API: load by URL or parsed JSON, read back a summary.
  useEffect(() => {
    const api = {
      load: (input: string | object) => load(input),
      summary: () => (traceRef.current ? fullSummary(traceRef.current) : null),
    };
    (window as unknown as { __trace: typeof api }).__trace = api;
    const src = new URLSearchParams(window.location.search).get("src");
    if (src) void load(src).catch(() => {});
    return () => {
      delete (window as unknown as { __trace?: unknown }).__trace;
    };
  }, [load]);

  const summaryJson = useMemo(() => (trace ? JSON.stringify(fullSummary(trace)) : ""), [trace]);
  const fixPrompt = useMemo(() => (trace ? buildFixPrompt(analyzeLoad(trace)) : ""), [trace]);

  return (
    <main className="container mx-auto px-4 py-12">
      <section className="mb-8 text-center">
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight md:text-5xl">Trace timeline</h1>
        <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
          Drop a Chrome DevTools performance profile (.json or .json.gz). Parsed locally in your
          browser. Scroll to zoom, drag to pan, click a lane label to collapse it.
        </p>
        {!trace && <AgentPrompt />}
      </section>
      <label
        className={cn(
          "mx-auto mb-4 flex max-w-3xl cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed bg-muted/30 p-10 text-center transition-colors hover:border-primary hover:bg-muted/50",
          dragging && "border-primary bg-muted/50",
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void load(e.dataTransfer.files[0]); }}
      >
        <UploadCloud className="size-8 text-muted-foreground" aria-hidden />
        <span className="text-lg font-semibold">
          {busy ? `Parsing… ${Math.round(progress * 100)}%` : "Drop a trace file here"}
        </span>
        <span className="text-sm text-muted-foreground">.json or .json.gz from Chrome DevTools · stays in your browser</span>
        {!busy && <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2")}>Choose file</span>}
        <input type="file" accept=".json,.gz" className="hidden" onChange={(e) => void load(e.target.files?.[0])} />
      </label>
      {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
      {trace && (
        <>
          <script type="application/json" id="trace-summary" dangerouslySetInnerHTML={{ __html: summaryJson }} />
          <KeyEventsPanel trace={trace} />
          <TraceLoadTimeline trace={trace} />
          <TraceTimeline trace={trace} />
          <FixPrompt text={fixPrompt} />
        </>
      )}
    </main>
  );
}
