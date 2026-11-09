import {
  analyzeTraceFile,
  parseTimeRange,
  scanTraces,
  TRACE_COMMANDS,
  type AnalyzeOptions,
  type TraceCommand,
  type TreeMode,
} from "./trace.js";
import { formatTraceReport, type OutputFormat } from "./traceFormat.js";

const VALUE_FLAGS = new Set([
  "--format",
  "--time-range",
  "--category",
  "--navigation",
  "--nav",
  "--min-duration",
  "--tree",
  "--top",
  "--function",
  "--slowest",
  "--initiator-chain",
  "--name",
  "--cat",
  "--phase",
  "--fields",
  "--limit",
  "--grep",
]);
const BOOLEAN_FLAGS = new Set(["--absolute-timestamps", "--render-blocking", "--events", "--help", "-h"]);

const USAGE = `Usage:
  web-perf-report trace [command] <file> [options]

Commands:
  overview (default)   Core Web Vitals, main-thread breakdown, warnings
  insights             LCP / INP / CLS / render-blocking / third-party cards
  tasks                Long main-thread tasks (or --tree bottom-up|top-down)
  find                 Find executions of a function (--function <name>)
  network              Slowest requests (--render-blocking, --slowest <n>)
  interactions         EventTiming interactions and INP subparts
  shifts               Layout-shift clusters and culprits (--events)
  events               Raw trace events (--name, --cat, --phase, --fields)
  navigations          Navigations and their insight sets
  scan                 Search many traces: trace scan <dir-or-glob> --grep <pattern>

Options:
  --format md|json|toon     Output format (default: md)
  --time-range <a,b>        Window in ms, or with units ("3.5s,4.2s")
  --absolute-timestamps     Treat --time-range values as raw trace timestamps
  -h, --help                Show this help (or "trace <command> --help")

Files may be .json or .json.gz.`;

interface CommandHelp {
  usage: string;
  summary: string;
  options: Array<[flag: string, description: string]>;
}

const COMMAND_HELP: Record<TraceCommand | "scan", CommandHelp> = {
  overview: {
    usage: "web-perf-report trace [overview] <file> [options]",
    summary: "Core Web Vitals, main-thread breakdown and warnings.",
    options: [],
  },
  insights: {
    usage: "web-perf-report trace insights <file> [options]",
    summary: "LCP / INP / CLS / render-blocking / third-party cards.",
    options: [
      ["--category <name>", "lcp | inp | cls | render-blocking | third-parties"],
      ["--navigation <id>", "Navigation or insight-set ID (also --nav)"],
    ],
  },
  tasks: {
    usage: "web-perf-report trace tasks <file> [options]",
    summary: "Long main-thread tasks, or a bottom-up/top-down call tree.",
    options: [
      ["--min-duration <ms>", "Minimum task duration (default 50)"],
      ["--tree <mode>", "list | bottom-up | top-down"],
      ["--top <n>", "Maximum rows (default 30)"],
    ],
  },
  find: {
    usage: "web-perf-report trace find <file> --function <name> [options]",
    summary: "Find executions of a function across the main thread.",
    options: [
      ["--function <name>", "Function name substring (required)"],
      ["--limit <n>", "Maximum calls to list (default 50)"],
    ],
  },
  network: {
    usage: "web-perf-report trace network <file> [options]",
    summary: "Slowest network requests and render-blocking status.",
    options: [
      ["--render-blocking", "Only render-blocking requests"],
      ["--slowest <n>", "Number of requests (default 20)"],
      ["--initiator-chain <url-or-id>", "Show the initiator chain for a request"],
    ],
  },
  interactions: {
    usage: "web-perf-report trace interactions <file> [options]",
    summary: "EventTiming interactions with INP subparts.",
    options: [],
  },
  shifts: {
    usage: "web-perf-report trace shifts <file> [options]",
    summary: "Layout-shift clusters and their culprits.",
    options: [["--events", "Include individual shift events"]],
  },
  events: {
    usage: "web-perf-report trace events <file> [options]",
    summary: "Raw trace events, filtered by name/category/phase.",
    options: [
      ["--name <names>", "Comma-separated exact event names"],
      ["--cat <category>", "Category, or comma-separated list (matches any)"],
      ["--phase <phase>", "Event phase, e.g. X, I, b, e"],
      ["--fields <fields>", "Comma-separated dot-notation fields to project"],
      ["--limit <n>", "Maximum events to list (default 50)"],
    ],
  },
  navigations: {
    usage: "web-perf-report trace navigations <file> [options]",
    summary: "Navigations and their insight sets.",
    options: [],
  },
  scan: {
    usage: "web-perf-report trace scan <dir-or-glob> [options]",
    summary: "Search many traces for events matching filters.",
    options: [
      ["--name <names>", "Comma-separated exact event names"],
      ["--cat <category>", "Category, or comma-separated list (matches any)"],
      ["--phase <phase>", "Event phase, e.g. X, I, b, e"],
      ["--grep <pattern>", "Substring match on event name/category/args"],
      ["--fields <fields>", "Comma-separated dot-notation fields that must exist"],
      ["--limit <n>", "Maximum files to list (default 50)"],
    ],
  },
};

/** Per-command flags, excluding the globals (`--format`, help). */
const COMMAND_OPTIONS: Record<TraceCommand | "scan", { values?: string[]; booleans?: string[] }> = {
  overview: {},
  insights: { values: ["--category", "--navigation", "--nav"] },
  tasks: { values: ["--min-duration", "--tree", "--top"] },
  find: { values: ["--function", "--limit"] },
  network: { values: ["--slowest", "--initiator-chain"], booleans: ["--render-blocking"] },
  interactions: {},
  shifts: { booleans: ["--events"] },
  events: { values: ["--name", "--cat", "--phase", "--fields", "--limit"] },
  navigations: {},
  scan: { values: ["--name", "--cat", "--phase", "--grep", "--fields", "--limit"] },
};

const GLOBAL_VALUE = new Set(["--format"]);
const GLOBAL_BOOLEAN = new Set(["--help", "-h"]);
const RANGE_VALUE = new Set(["--time-range"]);
const RANGE_BOOLEAN = new Set(["--absolute-timestamps"]);

interface ParsedArgs {
  positionals: string[];
  values: Map<string, string>;
  flags: Set<string>;
  /** Index of the first positional after `--`, if any. */
  literalStart?: number;
}

function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const values = new Map<string, string>();
  const flags = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--") {
      positionals.push(...argv.slice(i + 1));
      return { positionals, values, flags, literalStart: positionals.length - (argv.length - i - 1) };
    }
    if (arg.startsWith("--") && arg.includes("=")) {
      const [name, ...rest] = arg.split("=");
      if (!VALUE_FLAGS.has(name)) throw new Error(`Unknown option: ${name}`);
      values.set(name, rest.join("="));
      continue;
    }
    if (arg.startsWith("-")) {
      if (VALUE_FLAGS.has(arg)) {
        const value = argv[i + 1];
        if (value === undefined || (value.startsWith("--") && !/^-\d/.test(value))) {
          throw new Error(`${arg} needs a value`);
        }
        values.set(arg, value);
        i++;
      } else if (BOOLEAN_FLAGS.has(arg)) {
        flags.add(arg);
      } else {
        throw new Error(`Unknown option: ${arg}`);
      }
      continue;
    }
    positionals.push(arg);
  }
  return { positionals, values, flags };
}

const list = (value?: string): string[] | undefined => {
  const items = value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items?.length ? items : undefined;
};

function number(
  value: string | undefined,
  flag: string,
  fallback?: number,
  options: { integer?: boolean; min?: number } = {},
): number | undefined {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${flag} must be a number`);
  if (options.integer && !Number.isInteger(parsed)) throw new Error(`${flag} must be an integer`);
  if (options.min !== undefined && parsed < options.min) throw new Error(`${flag} must be >= ${options.min}`);
  return parsed;
}

function optionsFrom(parsed: ParsedArgs, command: TraceCommand): AnalyzeOptions {
  const { values, flags } = parsed;
  const options: AnalyzeOptions = {
    command,
    timeRange: values.get("--time-range"),
    absoluteTimestamps: flags.has("--absolute-timestamps"),
    limit: number(values.get("--limit"), "--limit", undefined, { integer: true, min: 1 }),
    fields: list(values.get("--fields")),
  };
  switch (command) {
    case "insights":
      options.category = values.get("--category") as AnalyzeOptions["category"];
      options.navigationId = values.get("--navigation") ?? values.get("--nav");
      break;
    case "tasks":
      options.minDurationMs = number(values.get("--min-duration"), "--min-duration", undefined, { min: 0 });
      options.tree = values.get("--tree") as TreeMode | undefined;
      options.top = number(values.get("--top"), "--top", undefined, { integer: true, min: 1 });
      break;
    case "find":
      options.functionName = values.get("--function");
      break;
    case "network":
      options.renderBlocking = flags.has("--render-blocking");
      options.slowest = number(values.get("--slowest"), "--slowest", undefined, { integer: true, min: 1 });
      options.initiatorChain = values.get("--initiator-chain");
      break;
    case "shifts":
      options.includeEvents = flags.has("--events");
      break;
    case "events":
      options.names = list(values.get("--name"));
      options.eventCategory = values.get("--cat");
      options.phase = values.get("--phase");
      break;
  }
  return options;
}

function helpFor(command?: TraceCommand | "scan"): string {
  if (!command) return USAGE;
  const help = COMMAND_HELP[command];
  const lines = ["Usage:", `  ${help.usage}`, "", help.summary];
  if (help.options.length) {
    lines.push("", "Options:");
    for (const [flag, description] of help.options) lines.push(`  ${flag.padEnd(34)} ${description}`);
  }
  lines.push("", "Global options:");
  lines.push("  --format md|json|toon             Output format (default: md)");
  if (command !== "insights" && command !== "navigations" && command !== "scan") {
    lines.push('  --time-range <a,b>                Window in ms, or with units ("3.5s,4.2s")');
    lines.push("  --absolute-timestamps             Treat --time-range values as raw trace timestamps");
  }
  lines.push("  -h, --help                        Show this help");
  lines.push("", "Files may be .json or .json.gz.");
  return lines.join("\n");
}

/** Reject flags that belong to another command instead of silently ignoring them. */
function validateFlags(parsed: ParsedArgs, command: TraceCommand, isScan: boolean): void {
  const key = isScan ? "scan" : command;
  const spec = COMMAND_OPTIONS[key];
  const allowedValues = new Set([...GLOBAL_VALUE, ...(spec.values ?? [])]);
  const allowedBooleans = new Set([...GLOBAL_BOOLEAN, ...(spec.booleans ?? [])]);
  // Insights and navigations are per-navigation models, not event windows.
  if (!isScan && command !== "insights" && command !== "navigations") {
    for (const flag of RANGE_VALUE) allowedValues.add(flag);
    for (const flag of RANGE_BOOLEAN) allowedBooleans.add(flag);
  }
  for (const name of parsed.values.keys()) {
    if (!allowedValues.has(name)) throw new Error(`${name} is not valid for the ${key} command.`);
  }
  for (const name of parsed.flags) {
    if (!allowedBooleans.has(name)) throw new Error(`${name} is not valid for the ${key} command.`);
  }
}

/** Runs `web-perf-report trace ...`. `argv` excludes the leading `trace`. */
export async function runTraceCli(argv: string[]): Promise<void> {
  const parsed = parseArgs(argv);
  const beforeLiteral = parsed.literalStart === 0 ? undefined : parsed.positionals[0];
  const isScan = beforeLiteral === "scan";
  const isCommand = beforeLiteral !== undefined && (TRACE_COMMANDS as string[]).includes(beforeLiteral);
  const command: TraceCommand = isCommand ? (beforeLiteral as TraceCommand) : "overview";

  if (parsed.flags.has("--help") || parsed.flags.has("-h")) {
    process.stdout.write(`${helpFor(isScan ? "scan" : isCommand ? command : undefined)}\n`);
    return;
  }

  const rest = isCommand || isScan ? parsed.positionals.slice(1) : parsed.positionals;

  const format = (parsed.values.get("--format") ?? "md") as OutputFormat;
  if (!["md", "json", "toon"].includes(format)) {
    throw new Error("--format must be md, json or toon");
  }

  validateFlags(parsed, command, isScan);

  if (isScan) {
    if (!rest.length) throw new Error("Provide a directory, file or glob to scan.");
    const report = scanTraces(rest, {
      names: list(parsed.values.get("--name")),
      category: parsed.values.get("--cat"),
      phase: parsed.values.get("--phase"),
      grep: parsed.values.get("--grep"),
      fields: list(parsed.values.get("--fields")),
      limit: number(parsed.values.get("--limit"), "--limit", undefined, { integer: true, min: 1 }),
    });
    process.stdout.write(`${formatTraceReport(report, format)}\n`);
    return;
  }

  if (!rest.length) throw new Error(`Provide a trace file. ${USAGE}`);
  if (rest.length > 1) throw new Error(`Expected one trace file, got ${rest.length}.`);
  if (command === "find" && !parsed.values.get("--function")) {
    throw new Error("find needs --function <name>");
  }
  // Validate eagerly so a typo fails before the (slow) engine parse.
  parseTimeRange(parsed.values.get("--time-range"));
  const category = parsed.values.get("--category");
  if (category && !["lcp", "inp", "cls", "render-blocking", "third-parties"].includes(category)) {
    throw new Error("--category must be lcp, inp, cls, render-blocking or third-parties");
  }
  const tree = parsed.values.get("--tree");
  if (tree && !["list", "bottom-up", "top-down"].includes(tree)) {
    throw new Error("--tree must be list, bottom-up or top-down");
  }

  const options = optionsFrom(parsed, command);
  const report = await analyzeTraceFile(rest[0], options);
  const includeHint = command === "overview" && !isCommand && format === "md";
  process.stdout.write(`${formatTraceReport(report, format, { includeHint })}\n`);
}
