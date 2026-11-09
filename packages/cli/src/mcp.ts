import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { postReport, runAudit } from "./core.js";
import { runStream } from "./stream.js";
import type { AnalyzeOptions, TraceCommand } from "./trace.js";
import { version } from "./version.js";

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const fail = (e: unknown) => ({
  isError: true,
  content: [{ type: "text" as const, text: e instanceof Error ? e.message : String(e) }],
});

/** Mirrors the CLI's per-command flag validation so MCP options are never silently ignored. */
const GLOBAL_TRACE_OPTIONS = ["trace", "file", "command", "format"] as const;
const COMMAND_TRACE_OPTIONS: Record<TraceCommand, string[]> = {
  overview: [],
  insights: ["category", "navigationId"],
  tasks: ["minDurationMs", "tree", "top"],
  find: ["functionName", "limit"],
  network: ["renderBlocking", "slowest", "initiatorChain"],
  interactions: [],
  shifts: ["includeEvents"],
  events: ["eventNames", "eventCategory", "phase", "fields", "limit"],
  navigations: [],
};

export function createServer(): McpServer {
  const server = new McpServer({ name: "web-perf-report", version });

  server.registerTool(
    "audit_site",
    {
      description:
        "Run Lighthouse (performance, accessibility, best-practices, SEO) against a URL on this machine and return a ranked markdown report: scores, metrics, failing audits with offending elements/resources, and a step-by-step speed-up prompt. Works for localhost/preview servers (audit a production build). Requires Node and Chrome. Slow: takes about 30-90 seconds per device (device 'both' runs mobile then desktop), so allow a long timeout.",
      inputSchema: {
        url: z.string().url().describe("Page URL to audit, e.g. https://example.com or http://localhost:3000"),
        device: z
          .enum(["mobile", "desktop", "both"])
          .optional()
          .describe("Device profile; default 'both'. Use 'mobile' for a faster run."),
      },
    },
    async ({ url, device }) => {
      try {
        return text(
          await runAudit({ url, device: device ?? "both", format: "md", onProgress: (m) => console.error(m) }),
        );
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "analyze_report",
    {
      description:
        "Analyze an existing Lighthouse result (lighthouse --output=json) or PageSpeed Insights v5 API response, or an array of them (e.g. mobile + desktop), and return the same ranked markdown report as audit_site. Use when you already have the JSON; no Chrome needed. Body must be under 4 MB.",
      inputSchema: {
        report: z
          .union([z.record(z.string(), z.unknown()), z.array(z.record(z.string(), z.unknown()))])
          .describe("Lighthouse or PSI JSON object, or an array of them"),
      },
    },
    async ({ report }) => {
      try {
        return text(await postReport(report, { format: "md" }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "measure_stream",
    {
      description:
        "Measure when each chunk of a page's streamed HTML arrives (TTFB, last byte, idle waiting gaps, late Suspense boundaries) from this machine, so localhost/preview servers work. Returns a markdown report plus a shareable link. Use it when a streaming framework (Next.js etc.) takes long to finish the document and you need to know what it is waiting on. Audit a production build, not a dev server. Takes a few seconds.",
      inputSchema: {
        url: z.string().url().describe("Page URL, e.g. https://example.com or http://localhost:3000"),
        compareUrl: z
          .string()
          .url()
          .optional()
          .describe("Optional second URL (e.g. a before/after build) to compare against; A = url, B = compareUrl"),
      },
    },
    async ({ url, compareUrl }) => {
      try {
        return text(await runStream({ url, compareUrl, format: "md", onProgress: (m) => console.error(m) }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "analyze_trace",
    {
      description:
        "Analyze a Chrome performance trace (DevTools Performance panel export, .json or .json.gz) with the same trace engine DevTools uses. Returns Core Web Vitals and main-thread breakdown by default; pass command 'insights' for LCP/INP/CLS/render-blocking/third-party breakdowns, 'tasks' for long tasks or bottom-up/top-down call trees, 'find' to locate a function, 'network' for slowest requests, 'interactions' for INP subparts, 'shifts' for CLS culprits, 'events' for raw events, or 'navigations'. Provide exactly one of the parsed trace as `trace`, or a local path as `file`.",
      inputSchema: {
        trace: z
          .union([z.record(z.string(), z.unknown()), z.array(z.unknown())])
          .optional()
          .describe("Trace JSON: an event array or an object with a traceEvents array"),
        file: z.string().optional().describe("Path to a trace file on this machine (.json or .json.gz)"),
        command: z
          .enum([
            "overview",
            "insights",
            "tasks",
            "find",
            "network",
            "interactions",
            "shifts",
            "events",
            "navigations",
          ])
          .optional()
          .describe("Drill-down to run; default overview"),
        timeRange: z
          .string()
          .optional()
          .describe('Time window relative to trace start, e.g. "3500,4200" or "3.5s,4.2s"'),
        absoluteTimestamps: z
          .boolean()
          .optional()
          .describe("Treat timeRange values as raw trace timestamps instead of relative to trace start"),
        category: z
          .enum(["lcp", "inp", "cls", "render-blocking", "third-parties"])
          .optional()
          .describe("For command 'insights': only this category"),
        navigationId: z.string().optional().describe("For command 'insights': navigation or insight-set ID"),
        minDurationMs: z
          .number()
          .nonnegative()
          .optional()
          .describe("For command 'tasks': minimum task duration (default 50)"),
        tree: z.enum(["list", "bottom-up", "top-down"]).optional().describe("For command 'tasks': call-tree mode"),
        top: z.number().int().positive().optional().describe("Maximum rows to return (default 30 for tasks)"),
        functionName: z.string().optional().describe("For command 'find': function name substring (required)"),
        renderBlocking: z.boolean().optional().describe("For command 'network': only render-blocking requests"),
        slowest: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("For command 'network': number of requests (default 20)"),
        initiatorChain: z
          .string()
          .optional()
          .describe("For command 'network': show the initiator chain for a request URL or request ID"),
        includeEvents: z.boolean().optional().describe("For command 'shifts': include individual shift events"),
        eventNames: z.array(z.string()).optional().describe("For command 'events': exact event names"),
        eventCategory: z.string().optional().describe("For command 'events': exact category"),
        phase: z.string().optional().describe("For command 'events': event phase, e.g. X, I, b, e"),
        fields: z.array(z.string()).optional().describe("Dot-notation event fields to project, e.g. args.data.url"),
        limit: z.number().int().positive().optional().describe("Maximum rows for find/events (default 50)"),
        format: z.enum(["md", "json", "toon"]).optional().describe("Output format (default md)"),
      },
    },
    async (input) => {
      try {
        const hasTrace = input.trace !== undefined;
        const hasFile = input.file !== undefined;
        if (hasTrace === hasFile) {
          throw new Error("Provide exactly one of `trace` JSON or a `file` path.");
        }
        const command = (input.command ?? "overview") as TraceCommand;
        if (command === "find" && !input.functionName) {
          throw new Error("The find command needs `functionName`.");
        }
        const allowed = new Set<string>([...GLOBAL_TRACE_OPTIONS, ...COMMAND_TRACE_OPTIONS[command]]);
        // Insights and navigations are per-navigation models, not event windows.
        if (command !== "insights" && command !== "navigations") {
          allowed.add("timeRange");
          allowed.add("absoluteTimestamps");
        }
        const unexpected = Object.entries(input)
          .filter(([key, value]) => value !== undefined && !allowed.has(key))
          .map(([key]) => key);
        if (unexpected.length) {
          throw new Error(`${unexpected.join(", ")} not valid for the ${command} command.`);
        }
        const options: AnalyzeOptions = {
          command,
          timeRange: input.timeRange,
          absoluteTimestamps: input.absoluteTimestamps,
          category: input.category,
          navigationId: input.navigationId,
          minDurationMs: input.minDurationMs,
          tree: input.tree,
          top: input.top,
          functionName: input.functionName,
          renderBlocking: input.renderBlocking,
          slowest: input.slowest,
          initiatorChain: input.initiatorChain,
          includeEvents: input.includeEvents,
          names: input.eventNames,
          eventCategory: input.eventCategory,
          phase: input.phase,
          fields: input.fields,
          limit: input.limit,
        };
        // Loaded lazily: the trace engine is large and only this tool needs it.
        const { analyzeTraceBody, analyzeTraceFile } = await import("./trace.js");
        const { formatTraceReport } = await import("./traceFormat.js");
        const report = hasFile
          ? await analyzeTraceFile(input.file as string, options)
          : await analyzeTraceBody(input.trace, options);
        return text(formatTraceReport(report, input.format ?? "md"));
      } catch (e) {
        return fail(e);
      }
    },
  );

  return server;
}

export async function startMcpServer(): Promise<void> {
  await createServer().connect(new StdioServerTransport());
  console.error("web-perf-report MCP server running on stdio");
}
