"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { parseTrace, summarizeTrace, type ParsedTrace } from "./parseTrace";
import { analyzeLoad } from "./analyzeLoad";
import { loadTrace } from "./loadTrace";
import { TraceTimeline } from "./TraceTimeline";
import { TraceLoadTimeline } from "./TraceLoadTimeline";
import { KeyEventsPanel, FixPrompt } from "./KeyEventsPanel";
import { GitCompare, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { buildFixPrompt } from "./fixPrompt";
import { buildSnapshot, type TraceSnapshot } from "./findings";
import { FindingsPanel } from "./FindingsPanel";
import { ComparePanel } from "./ComparePanel";
import { SharedSummary } from "./SharedSummary";
import { decodeSnapshot, hasShareHash } from "./shareFindings";

function fullSummary(t: ParsedTrace) {
  const { ttfb, fcp, lcp, cls, blockingMs } = analyzeLoad(t);
  return { ...summarizeTrace(t), metrics: { ttfb, fcp, lcp, cls, blockingMs } };
}

declare global {
  interface Window {
    __trace?: { load: (input: string | object) => Promise<unknown>; summary: () => unknown };
  }
}

const subscribeNever = () => () => {};
const getOrigin = () => window.location.origin;
const getServerOrigin = () => "";

/** Escape characters that could close the <script> tag or break JS parsers. */
function safeJsonForScript(json: string): string {
  return json
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function AgentPrompt() {
  const origin = useSyncExternalStore(subscribeNever, getOrigin, getServerOrigin);
  const prompt = `Analyze a Chrome performance trace with the timeline viewer at ${origin}/trace.

1. Serve the trace at a URL the browser can fetch: same-origin (e.g. copy it into apps/web/public/) or CORS-enabled. .json and .json.gz work; local file paths do not.
2. Open ${origin}/trace?src=<encoded-trace-url>, or run await window.__trace.load(url) if /trace is already open.
3. Wait for window.__trace.summary() to be non-null (max 30s). If it stays null, report the on-page error and stop. Never guess numbers.

Then report, from the summary (times are ms since navigation start; undefined = "n/a"):
- A table: page URL, TTFB, FCP, LCP, CLS, long-task count and total
- The 3 biggest problems, each tied to evidence (a long task, slice or the LCP element) and a likely cause`;
  return (
    <div className="mx-auto flex max-w-3xl items-start gap-2 rounded-lg border bg-muted/50 p-3 text-left">
      <pre className="max-h-[350px] flex-1 overflow-y-auto whitespace-pre-wrap font-mono text-sm">
        {prompt}
      </pre>
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
  const [compare, setCompare] = useState<TraceSnapshot | null>(null);
  const [shared, setShared] = useState<TraceSnapshot | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hasShareHash(hash)) return;
    let cancelled = false;
    void decodeSnapshot(hash).then((snapshot) => {
      if (!cancelled) setShared(snapshot);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadCompare = useCallback(async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const parsed = await loadTrace(file, setProgress);
      setCompare(buildSnapshot(parsed, analyzeLoad(parsed)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to read trace");
    } finally {
      setBusy(false);
    }
  }, []);

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
    window.__trace = api;
    return () => {
      delete window.__trace;
    };
  }, [load]);

  // Auto-load ?src=… on mount; `load` reports failures through the error state.
  // Scheduled (and cancelled on cleanup) so StrictMode's re-run doesn't fetch twice.
  useEffect(() => {
    const src = new URLSearchParams(window.location.search).get("src");
    if (!src) return;
    const timer = setTimeout(() => void load(src).catch(() => {}), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const summaryJson = useMemo(() => (trace ? JSON.stringify(fullSummary(trace)) : ""), [trace]);
  const analysis = useMemo(() => (trace ? analyzeLoad(trace) : null), [trace]);
  const snapshot = useMemo(
    () => (trace && analysis ? buildSnapshot(trace, analysis) : null),
    [trace, analysis],
  );
  const fixPrompt = useMemo(() => (analysis ? buildFixPrompt(analysis) : ""), [analysis]);

  const fileInput = (
    <input
      type="file"
      accept=".json,.gz"
      className="hidden"
      onChange={(e) => void load(e.target.files?.[0])}
    />
  );
  const parsing = busy ? `Parsing… ${Math.round(progress * 100)}%` : null;

  return (
    <main
      className={cn("container mx-auto px-4", trace ? "py-6" : "py-12")}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void load(e.dataTransfer.files[0]);
      }}
    >
      {trace ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed px-4 py-3">
          <h1 className="text-2xl font-bold tracking-tight">Trace timeline</h1>
          <div className="flex flex-wrap gap-2">
            <label
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "cursor-pointer")}
            >
              <GitCompare className="size-4" aria-hidden />
              Compare with another trace
              <input
                type="file"
                accept=".json,.gz"
                className="hidden"
                onChange={(e) => {
                  void loadCompare(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <label
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "cursor-pointer")}
            >
              <UploadCloud className="size-4" aria-hidden />
              {parsing ?? "Load another trace"}
              {fileInput}
            </label>
          </div>
        </div>
      ) : (
        <>
          <section className="mb-8 text-center">
            <h1 className="mb-4 text-4xl font-extrabold tracking-tight md:text-5xl">
              Trace timeline
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
              Drop a Chrome DevTools performance profile (.json or .json.gz). Parsed locally in your
              browser. Scroll to zoom, drag to pan, click a lane label to collapse it.
            </p>
            <AgentPrompt />
          </section>
          <label
            className={cn(
              "mx-auto mb-4 flex max-w-3xl cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed bg-muted/30 p-10 text-center transition-colors hover:border-primary hover:bg-muted/50",
              dragging && "border-primary bg-muted/50",
            )}
            onDragEnter={() => setDragging(true)}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
            }}
          >
            <UploadCloud className="size-8 text-muted-foreground" aria-hidden />
            <span className="text-lg font-semibold">{parsing ?? "Drop a trace file here"}</span>
            <span className="text-sm text-muted-foreground">
              .json or .json.gz from Chrome DevTools · stays in your browser
            </span>
            {!busy && (
              <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2")}>
                Choose file
              </span>
            )}
            {fileInput}
          </label>
        </>
      )}
      {!trace && shared && <SharedSummary snapshot={shared} />}
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}
      {trace && (
        <>
          <script
            type="application/json"
            id="trace-summary"
            dangerouslySetInnerHTML={{ __html: safeJsonForScript(summaryJson) }}
          />
          <KeyEventsPanel trace={trace} />
          {snapshot && <FindingsPanel snapshot={snapshot} />}
          {snapshot && compare && (
            <ComparePanel before={snapshot} after={compare} onClose={() => setCompare(null)} />
          )}
          <TraceLoadTimeline trace={trace} />
          <TraceTimeline trace={trace} />
          <FixPrompt text={fixPrompt} />
        </>
      )}
    </main>
  );
}
