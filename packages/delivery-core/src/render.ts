import type { DeliveryReport } from "./check";
import type { WireResult } from "./wire";

/** A 2xx response whose body is provably incomplete. */
export const isGhost = (r: WireResult) => r.status >= 200 && r.status < 300 && r.complete === false;

const ms = (n: number) => `${Math.round(n)} ms`;
const bytes = (n: number) => n.toLocaleString("en-US");
const END_LABEL: Record<WireResult["end"]["kind"], string> = {
  complete: "complete",
  rst_stream: "RST_STREAM",
  socket_close: "socket closed",
  timeout: "timeout",
  error: "error",
};
const endText = (r: WireResult) => `${END_LABEL[r.end.kind]}${r.end.code !== undefined ? ` ${r.end.code}` : ""} @ ${ms(r.end.atMs)}`;
const expected = (r: WireResult) => (r.declaredBytes !== undefined ? bytes(r.declaredBytes) : "?");

/** Ready-to-paste engineering ticket for one ghost. */
export function renderGhostTicket(report: DeliveryReport, r: WireResult): string {
  const gap = r.declaredBytes !== undefined ? ` (${bytes(r.declaredBytes - r.receivedBytes)} bytes missing)` : "";
  const evidence =
    r.declaredBytes !== undefined
      ? `content-length ${bytes(r.declaredBytes)} but ${bytes(r.receivedBytes)} wire bytes received${gap}`
      : `detected by ${r.check}${r.note ? `: ${r.note}` : ""}; ${bytes(r.receivedBytes)} wire bytes received`;
  return [
    `### Ticket: ghost error on ${r.url}`,
    `- **Symptom:** the server logged/returned HTTP ${r.status} over ${r.protocol}, but the client received an incomplete body. ${evidence}.`,
    `- **Expected:** the complete response body, ending cleanly (END_STREAM / final chunk).`,
    `- **Repro:** \`curl --http2 -A '${report.userAgent}' -sS -o /dev/null -w '%{size_download} %{http_code}\\n' ${r.url}\``,
    `- **Asset:** ${r.url}`,
    `- **How it ended:** ${endText(r)}`,
    `- **Byte gap:** ${r.declaredBytes !== undefined ? bytes(r.declaredBytes - r.receivedBytes) : "unknown (no content-length)"}`,
    `- **Check where:** proxy/CDN/load-balancer read or idle timeouts, origin crashes or restarts mid-response, HTTP/2 stream resets (RST_STREAM) in proxy logs, and the status the origin logged for this request (likely 200).`,
  ].join("\n");
}

export function renderDeliveryMarkdown(report: DeliveryReport): string {
  const all = [report.document, ...report.assets];
  const lines = [
    `# Delivery check: ${report.url}`,
    "",
    report.ghosts
      ? `**${report.ghosts} ghost response${report.ghosts > 1 ? "s" : ""}**: the server answered 2xx but the body arrived incomplete (of ${all.length} checked).`
      : `No ghost responses found (${all.length} checked).`,
    "",
    `UA: \`${report.userAgent}\`. Final URL: ${report.finalUrl}.`,
    "",
    "| Resource | Proto | Status | Received / expected bytes | End | Check | Complete |",
    "|---|---|---|---|---|---|---|",
    ...all.map(
      (r) =>
        `| ${isGhost(r) ? "**GHOST** " : ""}${r.url} | ${r.protocol} | ${r.status || "-"} | ${bytes(r.receivedBytes)} / ${expected(r)} | ${endText(r)} | ${r.check} | ${r.complete === null ? "unknown" : r.complete ? "yes" : "NO"} |`,
    ),
    "",
    "## Timings",
    "",
    "| Resource | DNS | TCP | TLS | TTFB | Total |",
    "|---|---|---|---|---|---|",
    ...all.map((r) => `| ${r.url} | ${ms(r.timings.dnsMs)} | ${ms(r.timings.tcpMs)} | ${ms(r.timings.tlsMs)} | ${ms(r.timings.ttfbMs)} | ${ms(r.timings.totalMs)} |`),
    "",
    "Connection timings are 0 for requests that reused an existing HTTP/2 connection.",
  ];
  if (report.notChecked.length) lines.push("", "## Not checked", "", ...report.notChecked.map((n) => `- ${n}`));
  for (const r of all.filter(isGhost)) lines.push("", renderGhostTicket(report, r));
  lines.push(
    "",
    `_Limitation: measured from ${report.measuredFrom === "server" ? "the web-perf-report server" : "this machine"}, not from Google's Web Rendering Service; a ghost seen by Googlebot may not reproduce here._`,
  );
  return lines.join("\n");
}
