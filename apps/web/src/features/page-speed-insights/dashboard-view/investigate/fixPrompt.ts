export type FixPromptInput = {
  url: string;
  formFactor: string;
  /** Metric acronym, e.g. "LCP". */
  metric?: string;
  title: string;
  evidence: { k: string; v: string }[];
  fix: string;
  auditId?: string;
};

/** Markdown brief for an AI coding agent to fix one diagnosed cause. */
export function buildFixPrompt({
  url,
  formFactor,
  metric,
  title,
  evidence,
  fix,
  auditId,
}: FixPromptInput): string {
  const lines = [
    `# Fix: ${title}`,
    "",
    `- Page: ${url}`,
    `- Device: ${formFactor}`,
    ...(metric ? [`- Metric: ${metric}`] : []),
    ...(auditId ? [`- Lighthouse audit: ${auditId}`] : []),
    "",
    "## Problem",
    `Lighthouse flagged "${title}"${metric ? ` as a cause of slow ${metric}` : ""}.`,
  ];
  if (evidence.length) {
    lines.push("", "## Evidence", ...evidence.map(({ k, v }) => `- ${k}: ${v}`));
  }
  lines.push(
    "",
    "## Suggested fix",
    fix,
    "",
    "## Verify",
    "Re-run Lighthouse (PageSpeed Insights) on the same page and device, and confirm the metric and this audit improve.",
  );
  return lines.join("\n");
}
