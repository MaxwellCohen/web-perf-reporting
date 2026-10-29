// Framework-agnostic optimization prompt, built from the report data that is available.
// Playbook adapted from https://sarthakmishra.com/blog/optimizing-tanstack-start
import { isEmptyResult } from "@/features/page-speed-insights/ScoreDisplay";
import {
  formatBytes,
  formatDurationMs,
  formatMs,
} from "@/features/page-speed-insights/shared/format";
import type { PageSpeedDashboardItem } from "@/lib/page-speed-insights/types";
import type { AuditResult, AuditResultsRecord, TableItem } from "@/lib/schema";

export const SPEED_UP_PROMPT_SOURCE = "https://sarthakmishra.com/blog/optimizing-tanstack-start";

const EVIDENCE_LIMIT = 5;

type Report = { label: string; audits: AuditResultsRecord };

export type SpeedUpFocusArea = {
  id: string;
  title: string;
  evidence: string[];
  advice: string[];
};

export type SpeedUpPrompt = {
  text: string;
  focusAreas: SpeedUpFocusArea[];
};

const INTRO = `You are a web performance engineer. Improve this site's Core Web Vitals (LCP, CLS, INP) and Lighthouse performance score using the PageSpeed Insights findings below. First identify the meta framework in use (e.g. Next.js, Nuxt, SvelteKit, Astro, Remix/React Router, TanStack Start, SolidStart, Qwik) and apply each fix with that framework's native APIs. Only work on the focus areas listed — they were selected from the report data. Work in small, separately measurable changes.`;

const MEASURE = [
  "Before measuring, ask me which target to test: a local production build of the repo (build, then run the preview/start server), the staging environment URL, or the live production URL. Wait for my answer and do not assume.",
  "Audit only a production build (local built output, staging, or production), never the dev server.",
  "Run Lighthouse several times and compare medians; single runs vary by several points.",
  "Make sure the preview/server applies Brotli or gzip, or results will be skewed.",
];

const LOCK_IN = [
  "Add bundle budgets enforced in CI (gzip bytes) for render-blocking CSS, total CSS, initial JS, and module preload count. Deferred downloads still count.",
  "Add browser tests that check main content exists before hydration, fonts load without reflow, hidden assets stay unloaded, and early scroll survives hydration.",
  "For each change: explain what changed and why, then re-measure on the same target I chose (built repo, staging, or production) and report before/after LCP, CLS, TBT, and JS/CSS transfer sizes.",
];

// ---------------------------------------------------------------- audit helpers

function isApplicable(audit: AuditResult | undefined): audit is AuditResult {
  const mode = audit?.scoreDisplayMode?.toLowerCase();
  return !!audit && mode !== "notapplicable" && mode !== "manual" && mode !== "error";
}

function isFailing(audit: AuditResult | undefined): audit is AuditResult {
  return isApplicable(audit) && audit.score !== null && audit.score < 0.9;
}

function hasFailingItems(audit: AuditResult | undefined): audit is AuditResult {
  return isFailing(audit) && !isEmptyResult(audit);
}

function items(audit: AuditResult | undefined): TableItem[] {
  const details = audit?.details as { items?: unknown } | undefined;
  return Array.isArray(details?.items) ? (details.items as TableItem[]) : [];
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

const URL_LIMIT = 150;

/** Resource URL for evidence lines; inline styles/scripts have source text in `url`. */
function resourceUrl(value: unknown): string | null {
  const url = str(value);
  if (!url) return null;
  if (!/^https?:\/\//.test(url)) return "inline <style>/<script>";
  return url.length > URL_LIMIT ? `${url.slice(0, URL_LIMIT - 1)}…` : url;
}

function rating(score: number | null): string {
  if (score === null) return "";
  if (score >= 0.9) return "good";
  if (score >= 0.5) return "needs improvement";
  return "poor";
}

function withLabel(text: string, label: string, multi: boolean) {
  return multi ? `[${label}] ${text}` : text;
}

/** Top table rows across reports, deduped by URL and ranked by `weight`. */
function topRows(
  reports: Report[],
  auditId: string,
  weight: (item: TableItem) => number,
  describe: (item: TableItem) => string | null,
): string[] {
  const best = new Map<string, { weight: number; text: string }>();
  for (const { audits } of reports) {
    const audit = audits[auditId];
    if (!hasFailingItems(audit)) continue;
    for (const item of items(audit)) {
      const text = describe(item);
      if (!text) continue;
      const key = str(item.url) ?? str(item.entity) ?? text;
      const w = weight(item);
      if ((best.get(key)?.weight ?? -1) < w) best.set(key, { weight: w, text });
    }
  }
  return [...best.values()]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, EVIDENCE_LIMIT)
    .map((row) => row.text);
}

function auditSummaries(reports: Report[], auditIds: string[]): string[] {
  const multi = reports.length > 1;
  const lines: string[] = [];
  for (const { label, audits } of reports) {
    for (const id of auditIds) {
      const audit = audits[id];
      if (!isFailing(audit)) continue;
      const value = audit.displayValue ? ` — ${audit.displayValue}` : "";
      lines.push(withLabel(`${audit.title}${value}`, label, multi));
    }
  }
  return lines;
}

function metricPoor(reports: Report[], auditId: string): boolean {
  return reports.some(({ audits }) => isFailing(audits[auditId]));
}

// ---------------------------------------------------------------- focus areas

function serverArea(reports: Report[], fieldTtfbSlow: boolean): SpeedUpFocusArea | null {
  const evidence = auditSummaries(reports, [
    "document-latency-insight",
    "server-response-time",
    "uses-text-compression",
    "redirects",
  ]);
  if (fieldTtfbSlow) evidence.push("Real-user (CrUX) Time to First Byte is not in the fast range.");
  if (evidence.length === 0) return null;
  return {
    id: "server",
    title: "Server response and document delivery",
    evidence,
    advice: [
      "Confirm the main heading and LCP content are present in the initial HTML response.",
      "Fetch page data in the framework's server loaders / server components instead of client-side effects.",
      "Prerender or statically generate public routes; keep request-time rendering only for personalized pages. Cache HTML at the edge/CDN where possible.",
      "Verify Content-Encoding (Brotli/gzip) on HTML and avoid redirects on the main document.",
    ],
  };
}

function lcpArea(reports: Report[]): SpeedUpFocusArea | null {
  if (!metricPoor(reports, "largest-contentful-paint")) return null;
  const multi = reports.length > 1;
  const evidence = auditSummaries(reports, ["largest-contentful-paint"]);
  let isImage = false;

  for (const { label, audits } of reports) {
    for (const entry of items(audits["lcp-breakdown-insight"])) {
      const entryRecord = entry as Record<string, unknown>;
      if (entryRecord.type === "node") {
        const snippet = str(entryRecord.snippet) ?? "";
        const name = str(entryRecord.nodeLabel) ?? str(entryRecord.selector) ?? "unknown element";
        if (/^<(img|picture|video|svg|image)\b/i.test(snippet)) isImage = true;
        evidence.push(
          withLabel(
            `LCP element: ${name}${snippet ? ` (\`${snippet.slice(0, 120)}\`)` : ""}`,
            label,
            multi,
          ),
        );
      }
      if (entryRecord.type === "table") {
        const rows = Array.isArray(entryRecord.items) ? (entryRecord.items as TableItem[]) : [];
        const subparts = rows
          .map((row) => `${str(row.label) ?? str(row.subpart)} ${formatMs(num(row.duration))}`)
          .join(", ");
        if (subparts) evidence.push(withLabel(`LCP breakdown: ${subparts}`, label, multi));
      }
    }
  }
  evidence.push(...auditSummaries(reports, ["lcp-discovery-insight"]));

  const advice = isImage
    ? [
        'The LCP element is media: make it discoverable in the initial HTML (no client-side injection or CSS background), set loading="eager" and fetchpriority="high", and give it explicit width/height.',
        "Serve it in AVIF/WebP at the size it renders, with `sizes` matching the layout.",
      ]
    : [
        "The LCP element is text: it is usually delayed by render-blocking CSS, web fonts, or hydration. Make sure it renders from server HTML without waiting for JavaScript.",
        "Preload only the font used by the LCP text, and keep its fallback metrics close (see Fonts).",
      ];
  advice.push(
    "Reduce any large 'element render delay' subpart by removing blocking work before first paint.",
  );
  return { id: "lcp", title: "Largest Contentful Paint", evidence, advice };
}

function renderBlockingArea(reports: Report[]): SpeedUpFocusArea | null {
  const evidence = topRows(
    reports,
    "render-blocking-insight",
    (item) => num(item.wastedMs) || num(item.totalBytes),
    (item) =>
      resourceUrl(item.url) &&
      `${resourceUrl(item.url)} (${formatBytes(num(item.totalBytes))}, blocks ~${formatMs(num(item.wastedMs))})`,
  );
  const cssRows = topRows(
    reports,
    "unused-css-rules",
    (item) => num(item.wastedBytes),
    (item) =>
      resourceUrl(item.url) &&
      `Unused CSS: ${resourceUrl(item.url)} (${formatBytes(num(item.wastedBytes))} unused)`,
  );
  if (evidence.length === 0 && cssRows.length === 0) return null;
  return {
    id: "render-blocking",
    title: "Render-blocking CSS and scripts",
    evidence: [...evidence, ...cssRows],
    advice: [
      "Keep only shared tokens and base styles global; co-locate feature styles with their routes/components so each page ships only the CSS it uses.",
      "Make non-critical scripts async/defer or load them after the load event.",
      "Consider critical-CSS inlining only after the above, and test dark mode, CSS-variable fonts, and form-control styles carefully.",
    ],
  };
}

function javascriptArea(reports: Report[]): SpeedUpFocusArea | null {
  const tbtPoor = metricPoor(reports, "total-blocking-time");
  const unused = topRows(
    reports,
    "unused-javascript",
    (item) => num(item.wastedBytes),
    (item) =>
      resourceUrl(item.url) &&
      `Unused JS: ${resourceUrl(item.url)} (${formatBytes(num(item.wastedBytes))} unused)`,
  );
  const bootup = topRows(
    reports,
    "bootup-time",
    (item) => num(item.total),
    (item) =>
      resourceUrl(item.url) &&
      `Execution time: ${resourceUrl(item.url)} (${formatMs(num(item.total))})`,
  );
  const legacy = topRows(
    reports,
    "legacy-javascript-insight",
    (item) => num(item.wastedBytes),
    (item) =>
      resourceUrl(item.url) &&
      `Legacy polyfills: ${resourceUrl(item.url)} (${formatBytes(num(item.wastedBytes))})`,
  );
  const evidence = [
    ...(tbtPoor ? auditSummaries(reports, ["total-blocking-time"]) : []),
    ...unused,
    ...bootup,
    ...legacy,
  ];
  if (evidence.length === 0) return null;
  const advice = [
    "Find large modules imported into every page (manifests, content indexes, icon sets, utility bundles). Pass each route only the data it renders and strip unused fields.",
    "Lazy-load anything not needed for first paint: search, menus, dialogs, lightboxes, editors, video players. Mount dialogs on first open, wrapped in Suspense/loading and error boundaries.",
    "Verify lazy chunks are NOT modulepreloaded on the initial page.",
  ];
  if (legacy.length > 0) {
    advice.push(
      "Update the browserslist/build target to modern browsers so polyfills for Baseline features are not shipped.",
    );
  }
  if (tbtPoor) {
    advice.push(
      "If the framework supports partial/deferred hydration (islands, server components, visible/idle hydration), defer hydration of below-the-fold and non-interactive sections.",
    );
  }
  return {
    id: "javascript",
    title: "JavaScript size and main-thread work",
    evidence,
    advice,
  };
}

function thirdPartyArea(reports: Report[]): SpeedUpFocusArea | null {
  const best = new Map<string, number>();
  for (const { audits } of reports) {
    const audit = audits["third-parties-insight"];
    if (!isApplicable(audit)) continue;
    for (const item of items(audit)) {
      const entity =
        str(item.entity) ??
        (item.entity && typeof item.entity === "object"
          ? str((item.entity as { text?: unknown }).text)
          : null);
      const time = num(item.mainThreadTime);
      if (entity && time >= 50) best.set(entity, Math.max(best.get(entity) ?? 0, time));
    }
  }
  const evidence = [...best.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, EVIDENCE_LIMIT)
    .map(([entity, time]) => `${entity}: ${formatMs(time)} main-thread time`);
  if (evidence.length === 0) return null;
  return {
    id: "third-parties",
    title: "Third-party scripts",
    evidence,
    advice: [
      "Load analytics, tag managers, chat, and consent scripts after the load event or first interaction (note: this can miss very short visits).",
      "Replace heavy embeds (video players, maps) with a lightweight facade that loads the real embed on click or when near the viewport.",
      "Use a helper that runs callbacks after `load` via requestIdleCallback (with a timeout), falling back to setTimeout, and cancels on cleanup.",
    ],
  };
}

function fontArea(reports: Report[]): SpeedUpFocusArea | null {
  const evidence = topRows(
    reports,
    "font-display-insight",
    (item) => num(item.wastedMs),
    (item) =>
      resourceUrl(item.url) && `${resourceUrl(item.url)} (est. ${formatMs(num(item.wastedMs))})`,
  );
  if (evidence.length === 0) return null;
  return {
    id: "fonts",
    title: "Web fonts",
    evidence,
    advice: [
      "Self-host WOFF2 subsets covering only the needed character ranges; drop unused weights, styles, and variable axes.",
      "Preload at most one or two critical fonts, matching the preload's URL, type, and crossorigin exactly so it isn't fetched twice.",
      "Prevent swap layout shift with a fallback @font-face using size-adjust, ascent-override, descent-override, and line-gap-override tuned to the web font.",
    ],
  };
}

function imageArea(reports: Report[]): SpeedUpFocusArea | null {
  const delivery = topRows(
    reports,
    "image-delivery-insight",
    (item) => num(item.wastedBytes),
    (item) =>
      resourceUrl(item.url) &&
      `${resourceUrl(item.url)} (${formatBytes(num(item.wastedBytes))} could be saved)`,
  );
  const unsized = auditSummaries(reports, ["unsized-images", "offscreen-images"]);
  const evidence = [...delivery, ...unsized];
  if (evidence.length === 0) return null;
  return {
    id: "images",
    title: "Images and media",
    evidence,
    advice: [
      "Serve AVIF/WebP at the rendered size; write `sizes` to match the layout at each breakpoint, not the source file width.",
      'Give every image width/height (or aspect-ratio) and loading="lazy" unless it is the LCP image.',
      "Make sure hidden or viewport-specific images (e.g. desktop-only navigation) don't load or preload on mobile. Defer video posters and players until near the viewport.",
    ],
  };
}

function clsArea(reports: Report[], fieldClsSlow: boolean): SpeedUpFocusArea | null {
  const evidence = metricPoor(reports, "cumulative-layout-shift")
    ? auditSummaries(reports, ["cumulative-layout-shift", "cls-culprits-insight", "unsized-images"])
    : [];
  if (fieldClsSlow) evidence.push("Real-user (CrUX) CLS is not in the good range.");
  if (evidence.length === 0) return null;
  return {
    id: "cls",
    title: "Layout shift",
    evidence,
    advice: [
      "Reserve space for images, embeds, ads, and late-loading components with explicit dimensions or aspect-ratio.",
      "Use font fallback metric overrides so the web-font swap doesn't move text.",
      "Don't insert banners or content above existing content after first paint.",
    ],
  };
}

function cachingArea(reports: Report[]): SpeedUpFocusArea | null {
  const evidence = topRows(
    reports,
    "cache-insight",
    (item) => num(item.wastedBytes),
    (item) =>
      resourceUrl(item.url) &&
      `${resourceUrl(item.url)} (cache ${num(item.cacheLifetimeMs) ? formatDurationMs(num(item.cacheLifetimeMs)) : "none"}, ${formatBytes(num(item.totalBytes))})`,
  );
  if (evidence.length === 0) return null;
  return {
    id: "caching",
    title: "Caching",
    evidence,
    advice: [
      "Serve content-hashed assets with `Cache-Control: public, max-age=31536000, immutable`.",
      "Set HTML cache lifetimes based on how often pages change. Third-party URLs you can't control are a reason to self-host or defer them.",
    ],
  };
}

function pageWeightArea(reports: Report[]): SpeedUpFocusArea | null {
  const evidence = auditSummaries(reports, ["total-byte-weight", "dom-size-insight"]);
  if (evidence.length === 0) return null;
  return {
    id: "page-weight",
    title: "Page weight",
    evidence,
    advice: [
      "Audit the largest transfers in the network panel and remove, defer, or compress them.",
      "Paginate or virtualize long lists and avoid rendering hidden UI into the initial DOM.",
    ],
  };
}

// ---------------------------------------------------------------- context

const FIELD_METRICS: Record<string, string> = {
  LARGEST_CONTENTFUL_PAINT_MS: "LCP",
  INTERACTION_TO_NEXT_PAINT: "INP",
  CUMULATIVE_LAYOUT_SHIFT_SCORE: "CLS",
  FIRST_CONTENTFUL_PAINT_MS: "FCP",
  EXPERIMENTAL_TIME_TO_FIRST_BYTE: "TTFB",
};

type FieldMetric = { percentile?: number; category?: string };

function fieldMetrics(item: PageSpeedDashboardItem["item"]): Record<string, FieldMetric> {
  const metrics = (item.loadingExperience as { metrics?: Record<string, FieldMetric> } | undefined)
    ?.metrics;
  return metrics ?? {};
}

function formatFieldValue(key: string, percentile: number): string {
  if (key === "CUMULATIVE_LAYOUT_SHIFT_SCORE") return (percentile / 100).toFixed(2);
  return formatMs(percentile);
}

const LAB_METRICS = [
  "first-contentful-paint",
  "largest-contentful-paint",
  "total-blocking-time",
  "cumulative-layout-shift",
  "speed-index",
];

function reportContext(dashboardItem: PageSpeedDashboardItem): string[] {
  const lighthouse = dashboardItem.item.lighthouseResult;
  const audits = lighthouse?.audits ?? {};
  const url = lighthouse?.finalDisplayedUrl ?? lighthouse?.finalUrl ?? lighthouse?.requestedUrl;
  const formFactor = lighthouse?.configSettings?.formFactor;
  const score = lighthouse?.categories?.performance?.score;

  const header = [
    dashboardItem.label,
    url ? `URL ${url}` : null,
    formFactor ? `${formFactor}` : null,
    typeof score === "number" ? `performance score ${Math.round(score * 100)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const lab = LAB_METRICS.flatMap((id) => {
    const audit = audits[id];
    if (!audit?.displayValue) return [];
    const r = rating(audit.score);
    return [`${audit.title} ${audit.displayValue}${r ? ` (${r})` : ""}`];
  });

  const field = Object.entries(FIELD_METRICS).flatMap(([key, name]) => {
    const metric = fieldMetrics(dashboardItem.item)[key];
    if (typeof metric?.percentile !== "number") return [];
    const category = metric.category ? ` (${metric.category.toLowerCase()})` : "";
    return [`${name} ${formatFieldValue(key, metric.percentile)}${category}`];
  });

  const libraries = items(audits["js-libraries"])
    .map((row) => [str(row.name), str(row.version)].filter(Boolean).join(" "))
    .filter(Boolean);

  return [
    `- ${header}`,
    lab.length ? `  - Lab: ${lab.join("; ")}` : null,
    field.length ? `  - Real users (CrUX p75): ${field.join("; ")}` : null,
    libraries.length ? `  - Detected libraries: ${libraries.join(", ")}` : null,
  ].filter((line): line is string => line !== null);
}

function fieldNotGood(items: PageSpeedDashboardItem[], key: string): boolean {
  return items.some((item) => {
    const category = fieldMetrics(item.item)[key]?.category;
    return category !== undefined && category !== "FAST";
  });
}

// ---------------------------------------------------------------- builder

function bullets(lines: string[]): string {
  return lines.map((line) => `- ${line}`).join("\n");
}

export function buildSpeedUpPrompt(dashboardItems: PageSpeedDashboardItem[]): SpeedUpPrompt {
  const reports: Report[] = dashboardItems.flatMap((item) => {
    const audits = item.item.lighthouseResult?.audits;
    return audits ? [{ label: item.label, audits }] : [];
  });

  const focusAreas = [
    serverArea(reports, fieldNotGood(dashboardItems, "EXPERIMENTAL_TIME_TO_FIRST_BYTE")),
    lcpArea(reports),
    renderBlockingArea(reports),
    javascriptArea(reports),
    thirdPartyArea(reports),
    fontArea(reports),
    imageArea(reports),
    clsArea(reports, fieldNotGood(dashboardItems, "CUMULATIVE_LAYOUT_SHIFT_SCORE")),
    cachingArea(reports),
    pageWeightArea(reports),
  ].filter((area): area is SpeedUpFocusArea => area !== null);

  const context = dashboardItems.flatMap(reportContext);

  const sections = [
    INTRO,
    context.length ? `## Report data\n${context.join("\n")}` : null,
    `## 1. Measure correctly before changing anything\n${bullets(MEASURE)}`,
    ...focusAreas.map(
      (area, index) =>
        `## ${index + 2}. ${area.title}\nEvidence from the report:\n${bullets(area.evidence)}\n\nWhat to do:\n${bullets(area.advice)}`,
    ),
    focusAreas.length === 0
      ? "No significant issues were found in this report. Focus on keeping the current performance from regressing."
      : null,
    `## ${focusAreas.length + 2}. Lock in the gains\n${bullets(LOCK_IN)}`,
  ];

  return {
    text: sections.filter((section): section is string => section !== null).join("\n\n"),
    focusAreas,
  };
}
