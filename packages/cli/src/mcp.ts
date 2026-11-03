import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { postReport, runAudit } from "./core.js";

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const fail = (e: unknown) => ({
  isError: true,
  content: [{ type: "text" as const, text: e instanceof Error ? e.message : String(e) }],
});

export function createServer(): McpServer {
  const server = new McpServer({ name: "web-perf-report", version: "0.1.0" });

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

  return server;
}

export async function startMcpServer(): Promise<void> {
  await createServer().connect(new StdioServerTransport());
  console.error("web-perf-report MCP server running on stdio");
}
