import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterAll, beforeAll, expect, it } from "vitest";
import { createServer } from "../src/mcp.js";
import { miniTrace } from "./traceFixture.js";

let dir = "";
let traceFile = "";

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "web-perf-mcp-test-"));
  traceFile = join(dir, "mini.json");
  await writeFile(traceFile, JSON.stringify(miniTrace()));
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function connect() {
  const [a, b] = InMemoryTransport.createLinkedPair();
  await createServer().connect(a);
  const client = new Client({ name: "t", version: "0" });
  await client.connect(b);
  return client;
}

const firstText = (result: { content: unknown }) =>
  (result.content as Array<{ type: string; text: string }>)[0].text;

it("lists audit_site, analyze_report, measure_stream and analyze_trace", async () => {
  const { tools } = await (await connect()).listTools();
  expect(tools.map((t) => t.name).sort()).toEqual([
    "analyze_report",
    "analyze_trace",
    "audit_site",
    "measure_stream",
  ]);
});

it("analyzes a trace and runs drill-down commands", async () => {
  const client = await connect();
  const overview = await client.callTool({ name: "analyze_trace", arguments: { trace: miniTrace() } });
  const overviewText = firstText(overview);
  expect(overviewText).toContain("# Trace Overview");
  expect(overviewText).toContain("https://x.test/");
  expect(overviewText).toContain("| LCP | 2500ms | good |");

  const insights = await client.callTool({
    name: "analyze_trace",
    arguments: { trace: miniTrace(), command: "insights", category: "lcp" },
  });
  const insightsText = firstText(insights);
  expect(insightsText).toContain("## LCP Breakdown");
  expect(insightsText).toContain("**Element**: `IMG`");
  expect(insightsText).not.toContain("## INP Breakdown");
});

it("analyzes a local trace file and can return JSON", async () => {
  const client = await connect();
  const result = await client.callTool({
    name: "analyze_trace",
    arguments: { file: traceFile, format: "json" },
  });
  expect(JSON.parse(firstText(result)).command).toBe("overview");
});

it("returns a tool error when neither trace nor file is given", async () => {
  const result = await (await connect()).callTool({ name: "analyze_trace", arguments: {} });
  expect(result.isError).toBe(true);
  expect(firstText(result)).toContain("Provide exactly one of `trace` JSON");
});

it("returns a tool error when both trace and file are given", async () => {
  const result = await (await connect()).callTool({
    name: "analyze_trace",
    arguments: { trace: miniTrace(), file: traceFile },
  });
  expect(result.isError).toBe(true);
  expect(firstText(result)).toContain("Provide exactly one of `trace` JSON");
});

it("requires functionName for the find command", async () => {
  const result = await (await connect()).callTool({
    name: "analyze_trace",
    arguments: { trace: miniTrace(), command: "find" },
  });
  expect(result.isError).toBe(true);
  expect(firstText(result)).toContain("needs `functionName`");
});

it("rejects options that do not apply to the chosen command", async () => {
  const client = await connect();
  const tasks = await client.callTool({
    name: "analyze_trace",
    arguments: { trace: miniTrace(), command: "tasks", navigationId: "NAVIGATION_0" },
  });
  expect(tasks.isError).toBe(true);
  expect(firstText(tasks)).toContain("navigationId not valid for the tasks command.");

  const insights = await client.callTool({
    name: "analyze_trace",
    arguments: { trace: miniTrace(), command: "insights", timeRange: "0,1000" },
  });
  expect(insights.isError).toBe(true);
  expect(firstText(insights)).toContain("timeRange not valid for the insights command.");

  const overview = await client.callTool({
    name: "analyze_trace",
    arguments: { trace: miniTrace(), command: "overview", category: "lcp" },
  });
  expect(overview.isError).toBe(true);
  expect(firstText(overview)).toContain("category not valid for the overview command.");
});
