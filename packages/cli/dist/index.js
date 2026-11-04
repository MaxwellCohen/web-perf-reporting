#!/usr/bin/env node
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { defineCommand, runMain } from "citty";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
function lighthouseArgs(url, outputPath, device) {
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
		"--quiet"
	];
	if (device === "desktop") args.push("--preset=desktop");
	return args;
}
function runNpx(args) {
	return new Promise((resolve, reject) => {
		const child = spawn("npx", args, { stdio: [
			"ignore",
			"ignore",
			"pipe"
		] });
		let stderr = "";
		child.stderr.on("data", (chunk) => {
			stderr += String(chunk);
			if (stderr.length > 2e4) stderr = stderr.slice(-2e4);
		});
		child.on("error", (err) => reject(/* @__PURE__ */ new Error(`Could not start npx: ${err.message}`)));
		child.on("close", (code) => {
			if (code === 0) return resolve();
			const tail = stderr.trim().split("\n").slice(-10).join("\n");
			reject(/* @__PURE__ */ new Error(`Lighthouse failed (exit ${code}). Is Chrome installed and the URL reachable?${tail ? `\n${tail}` : ""}`));
		});
	});
}
async function runLighthouse(url, device) {
	const dir = await mkdtemp(join(tmpdir(), "web-perf-report-"));
	try {
		const out = join(dir, `${device}.json`);
		await runNpx(lighthouseArgs(url, out, device));
		return JSON.parse(await readFile(out, "utf8"));
	} finally {
		await rm(dir, {
			recursive: true,
			force: true
		});
	}
}
async function postReport(body, opts = {}) {
	const base = (opts.apiBase || process.env.WEB_PERF_REPORT_API || "https://web-perf-report.vercel.app").replace(/\/+$/, "");
	const res = await fetch(`${base}/api/agent/report?format=${opts.format ?? "md"}`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body)
	});
	const text = await res.text();
	if (!res.ok) throw new Error(`Report API returned ${res.status}: ${text.slice(0, 500)}`);
	return text;
}
async function runAudit(opts) {
	const { url, device = "both", format = "md", apiBase, lighthouseJson, onProgress } = opts;
	let body = lighthouseJson;
	if (body === void 0) {
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
	return postReport(body, {
		apiBase,
		format
	});
}
// src/index.ts
const mcp = defineCommand({
	meta: {
		name: "mcp",
		description: "Start the MCP server (stdio)"
	},
	async run() {
		const { startMcpServer } = await import("./mcp-1ux6UaRp.js");
		await startMcpServer();
	}
});
const main = defineCommand({
	meta: {
		name: "web-perf-report",
		version: "0.1.0",
		description: "Run Lighthouse on a URL and print a ranked performance report. Run `web-perf-report mcp` to start the MCP server (stdio)."
	},
	args: {
		url: {
			type: "positional",
			required: false,
			description: "URL to audit"
		},
		device: {
			type: "string",
			default: "both",
			description: "mobile | desktop | both"
		},
		format: {
			type: "string",
			default: "md",
			description: "md | json"
		},
		file: {
			type: "string",
			description: "Analyze an existing Lighthouse/PSI JSON file instead of running Lighthouse"
		},
		api: {
			type: "string",
			description: "API base URL (env WEB_PERF_REPORT_API)"
		}
	},
	async run({ args }) {
		const fail = (msg) => {
			console.error(`Error: ${msg}`);
			process.exit(1);
		};
		if (![
			"mobile",
			"desktop",
			"both"
		].includes(args.device)) fail("--device must be mobile, desktop or both");
		if (!["md", "json"].includes(args.format)) fail("--format must be md or json");
		if (!args.url && !args.file) fail("Provide a <url> or --file <path.json>");
		try {
			const lighthouseJson = args.file ? JSON.parse(await readFile(args.file, "utf8")) : void 0;
			const out = await runAudit({
				url: args.url,
				device: args.device,
				format: args.format,
				apiBase: args.api,
				lighthouseJson,
				onProgress: (m) => console.error(m)
			});
			process.stdout.write(out.endsWith("\n") ? out : `${out}\n`);
		} catch (e) {
			fail(e instanceof Error ? e.message : String(e));
		}
	}
});
runMain(process.argv[2] === "mcp" ? mcp : main);
export { runAudit as n, postReport as t };
