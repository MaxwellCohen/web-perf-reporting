#!/usr/bin/env node
// Record a Chrome performance trace of a URL and (optionally) send it to the analyzer API.
// Usage: node scripts/record-trace.mjs <url> [--out trace.json] [--cpu 4] [--api https://host] [--format md|json]
import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const url = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (!url || !/^https?:\/\//.test(url)) {
  console.error(
    "Usage: record-trace.mjs <http(s) url> [--out file] [--cpu N] [--api base] [--format md|json]",
  );
  process.exit(2);
}
const out = flag("out", "trace.json");
const cpu = Number(flag("cpu", "4"));
const api = flag("api");
const format = flag("format", "md");

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const cdp = await page.context().newCDPSession(page);
  if (cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
  await browser.startTracing(page, {
    path: out,
    categories: [
      "devtools.timeline",
      "disabled-by-default-devtools.timeline",
      "v8.execute",
      "loading",
      "blink.user_timing",
      "latencyInfo",
    ],
  });
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(3000);
  await browser.stopTracing();
} finally {
  await browser.close();
}
console.error(`Trace written to ${out}`);

if (api) {
  if ((await readFile(out)).length > 4_000_000)
    console.error(
      "Warning: trace is over 4 MB; the hosted API may reject it. Use the /trace UI instead.",
    );
  const res = await fetch(`${api.replace(/\/$/, "")}/api/agent/trace?format=${format}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: await readFile(out),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Analyzer returned ${res.status}: ${text}`);
    process.exit(1);
  }
  console.log(text);
}
