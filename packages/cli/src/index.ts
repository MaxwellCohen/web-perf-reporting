#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { defineCommand, runMain } from "citty";
import { runAudit, type Device, type Format } from "./core.js";

const mcp = defineCommand({
  meta: { name: "mcp", description: "Start the MCP server (stdio)" },
  async run() {
    const { startMcpServer } = await import("./mcp.js");
    await startMcpServer();
  },
});

const main = defineCommand({
  meta: {
    name: "web-perf-report",
    version: "0.1.0",
    description: "Run Lighthouse on a URL and print a ranked performance report. Run `web-perf-report mcp` to start the MCP server (stdio).",
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

// citty rejects a positional URL when subCommands exist, so route `mcp` by hand.
void runMain(process.argv[2] === "mcp" ? mcp : main);
