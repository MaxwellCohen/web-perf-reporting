import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type Device = "mobile" | "desktop" | "both";
export type Format = "md" | "json";

export const DEFAULT_API = "https://web-perf-report.vercel.app";

export interface AuditOptions {
  url?: string;
  device?: Device;
  apiBase?: string;
  format?: Format;
  /** Pre-collected Lighthouse/PSI JSON (object or array); skips Lighthouse. */
  lighthouseJson?: unknown;
  onProgress?: (message: string) => void;
}

export function lighthouseArgs(url: string, outputPath: string, device: "mobile" | "desktop"): string[] {
  const args = [
    "-y",
    "lighthouse",
    url,
    "--output=json",
    `--output-path=${outputPath}`,
    "--only-categories=performance,accessibility,best-practices,seo",
    "--disable-full-page-screenshot",
    "--skip-audits=screenshot-thumbnails,final-screenshot",
    "--chrome-flags=--headless=new",
    "--quiet",
  ];
  if (device === "desktop") args.push("--preset=desktop");
  return args;
}

function runNpx(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
      if (stderr.length > 20_000) stderr = stderr.slice(-20_000);
    });
    child.on("error", (err) => reject(new Error(`Could not start npx: ${err.message}`)));
    child.on("close", (code) => {
      if (code === 0) return resolve();
      const tail = stderr.trim().split("\n").slice(-10).join("\n");
      reject(
        new Error(
          `Lighthouse failed (exit ${code}). Is Chrome installed and the URL reachable?${tail ? `\n${tail}` : ""}`,
        ),
      );
    });
  });
}

async function runLighthouse(url: string, device: "mobile" | "desktop"): Promise<unknown> {
  const dir = await mkdtemp(join(tmpdir(), "web-perf-report-"));
  try {
    const out = join(dir, `${device}.json`);
    await runNpx(lighthouseArgs(url, out, device));
    return JSON.parse(await readFile(out, "utf8"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function postReport(
  body: unknown,
  opts: { apiBase?: string; format?: Format } = {},
): Promise<string> {
  const base = (opts.apiBase || process.env.WEB_PERF_REPORT_API || DEFAULT_API).replace(/\/+$/, "");
  const res = await fetch(`${base}/api/agent/report?format=${opts.format ?? "md"}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Report API returned ${res.status}: ${text.slice(0, 500)}`);
  return text;
}

export async function runAudit(opts: AuditOptions): Promise<string> {
  const { url, device = "both", format = "md", apiBase, lighthouseJson, onProgress } = opts;
  let body: unknown = lighthouseJson;
  if (body === undefined) {
    if (!url) throw new Error("A url (or a report file) is required.");
    if (device === "both") {
      onProgress?.("Running Lighthouse (mobile)...");
      const mobile = await runLighthouse(url, "mobile");
      onProgress?.("Running Lighthouse (desktop)...");
      body = [mobile, await runLighthouse(url, "desktop")];
    } else {
      onProgress?.(`Running Lighthouse (${device})...`);
      body = await runLighthouse(url, device);
    }
  }
  onProgress?.("Analyzing report...");
  return postReport(body, { apiBase, format });
}
