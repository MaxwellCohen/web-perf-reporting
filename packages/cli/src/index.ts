#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { defineCommand, runMain } from "citty";
import { dropFirstPositional, firstPositional } from "./argv.js";
import { runAudit, type Device, type Format } from "./core.js";
import { runStream } from "./stream.js";
import { version } from "./version.js";

const mcp = defineCommand({
  meta: { name: "mcp", description: "Start the MCP server (stdio)" },
  async run() {
    const { startMcpServer } = await import("./mcp.js");
    await startMcpServer();
  },
});

const stream = defineCommand({
  meta: {
    name: "web-perf-report stream",
    description:
      "Measure when each chunk of a page's streamed HTML arrives (works for localhost) and print where the server is waiting, with a shareable link. Pass a second URL to compare.",
  },
  args: {
    url: { type: "positional", required: true, description: "Page URL, e.g. http://localhost:3000" },
    compare: { type: "positional", required: false, description: "Second URL to compare against (A = url, B = compare)" },
    format: { type: "string", default: "md", description: "md | json" },
    api: { type: "string", description: "API base URL (env WEB_PERF_REPORT_API)" },
  },
  async run({ args }) {
    if (!["md", "json"].includes(args.format)) {
      console.error("Error: --format must be md or json");
      process.exit(1);
    }
    try {
      const out = await runStream({ url: args.url, compareUrl: args.compare, format: args.format as Format, apiBase: args.api, onProgress: (m) => console.error(m) });
      process.stdout.write(out.endsWith("\n") ? out : `${out}\n`);
    } catch (e) {
      console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(1);
    }
  },
});

const main = defineCommand({
  meta: {
    name: "web-perf-report",
    version,
    description:
      "Run Lighthouse on a URL and print a ranked performance report. `web-perf-report stream <url>` measures streamed-HTML chunk timing; `web-perf-report mcp` starts the MCP server (stdio).",
  },
  args: {
    url: { type: "positional", required: false, description: "URL to audit" },
    device: { type: "string", default: "both", description: "mobile | desktop | both" },
    format: { type: "string", default: "md", description: "md | json" },
    file: { type: "string", description: "Analyze an existing Lighthouse/PSI JSON file instead of running Lighthouse" },
    api: { type: "string", description: "API base URL (env WEB_PERF_REPORT_API)" },
  },
  async run({ args }) {
    const fail = (msg: string): never => {
      console.error(`Error: ${msg}`);
      process.exit(1);
    };
    if (!["mobile", "desktop", "both"].includes(args.device)) fail("--device must be mobile, desktop or both");
    if (!["md", "json"].includes(args.format)) fail("--format must be md or json");
    if (!args.url && !args.file) fail("Provide a <url> or --file <path.json>");
    try {
      const lighthouseJson = args.file ? JSON.parse(await readFile(args.file, "utf8")) : undefined;
      const out = await runAudit({
        url: args.url,
        device: args.device as Device,
        format: args.format as Format,
        apiBase: args.api,
        lighthouseJson,
        onProgress: (m) => console.error(m),
      });
      process.stdout.write(out.endsWith("\n") ? out : `${out}\n`);
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
    }
  },
});

// citty rejects a positional URL when subCommands exist, so route subcommands by hand.
const argv = process.argv.slice(2);
const sub = firstPositional(argv);
if (sub === "stream") void runMain(stream, { rawArgs: dropFirstPositional(argv) });
else if (sub === "mcp") void runMain(mcp);
else void runMain(main);
