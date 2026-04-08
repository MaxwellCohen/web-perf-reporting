import type { ActionableStep } from "@/features/page-speed-insights/RecommendationsSection/types";

type CategoryRule = {
  match: (auditId: string) => boolean;
  category: string;
  getSteps: () => ActionableStep[];
};

function actionableSteps(...text: string[]): ActionableStep[] {
  return text.map((step) => ({ step, reports: [] }));
}

function getRenderBlockingSteps(): ActionableStep[] {
  return actionableSteps(
    "Defer non-critical CSS and JavaScript",
    "Inline critical CSS",
    "Use `preload` for critical resources",
    "Remove unused CSS and JavaScript",
  );
}

function getJavaScriptSteps(): ActionableStep[] {
  return actionableSteps(
    "Use code splitting to load only what you need",
    "Consider lazy loading for non-critical scripts",
    "Audit your bundle size regularly",
  );
}

function getJavaScriptExecutionSteps(): ActionableStep[] {
  return actionableSteps(
    "Minify and compress JavaScript",
    "Use code splitting and lazy loading",
    "Remove unused dependencies",
    "Consider using lighter alternatives to heavy libraries",
  );
}

function getCSSSteps(): ActionableStep[] {
  return actionableSteps(
    "Use CSS purging tools",
    "Split CSS by page/component",
    "Consider critical CSS extraction",
  );
}

function getImageSteps(): ActionableStep[] {
  return actionableSteps(
    "Use modern image formats (WebP, AVIF)",
    "Implement lazy loading for below-the-fold images",
    "Optimize image dimensions to match display size",
    "Use responsive images with srcset",
    "Consider using a CDN for image delivery",
  );
}

function getServerSteps(): ActionableStep[] {
  return actionableSteps(
    "Use a CDN for static assets",
    "Enable HTTP/2 or HTTP/3",
    "Implement server-side caching",
    "Consider using edge computing",
  );
}

function getResourceHintsSteps(): ActionableStep[] {
  return actionableSteps(
    "Preconnect to important third-party origins",
    "Preload critical fonts and CSS",
  );
}

function getFontSteps(): ActionableStep[] {
  return actionableSteps(
    "Use `font-display: swap` for better rendering",
    "Subset fonts to include only needed characters",
    "Consider using system fonts for body text",
  );
}

function getNetworkSteps(): ActionableStep[] {
  return actionableSteps(
    "Compress assets with gzip or brotli",
    "Remove unused resources",
    "Optimize and minify all assets",
  );
}

function getRedirectSteps(): ActionableStep[] {
  return actionableSteps(
    "Use direct URLs when possible",
    "Implement server-side redirects instead of client-side",
  );
}

/** Same order as previous if-chains: first matching rule wins. */
const CATEGORY_RULES: CategoryRule[] = [
  {
    match: (id) => id.includes("render-blocking") || id.includes("render-blocking-resources"),
    category: "Render Blocking",
    getSteps: getRenderBlockingSteps,
  },
  {
    match: (id) => id.includes("unused") && id.includes("javascript"),
    category: "JavaScript",
    getSteps: getJavaScriptSteps,
  },
  {
    match: (id) => id.includes("unused") && id.includes("css"),
    category: "CSS",
    getSteps: getCSSSteps,
  },
  {
    match: (id) => id.includes("image") || id.includes("offscreen-images"),
    category: "Images",
    getSteps: getImageSteps,
  },
  {
    match: (id) => id.includes("javascript") && id.includes("execution"),
    category: "JavaScript",
    getSteps: getJavaScriptExecutionSteps,
  },
  {
    match: (id) => id.includes("server-response-time") || id.includes("ttfb"),
    category: "Server",
    getSteps: getServerSteps,
  },
  {
    match: (id) => id.includes("preload") || id.includes("preconnect"),
    category: "Resource Hints",
    getSteps: getResourceHintsSteps,
  },
  {
    match: (id) => id.includes("font") || id.includes("text"),
    category: "Fonts",
    getSteps: getFontSteps,
  },
  {
    match: (id) => id.includes("redirect"),
    category: "Network",
    getSteps: getRedirectSteps,
  },
  {
    match: (id) => id.includes("total-byte-weight") || id.includes("network"),
    category: "Network",
    getSteps: getNetworkSteps,
  },
];

function getDefaultSteps(specificRecs: ActionableStep[]): ActionableStep[] {
  const tail = actionableSteps(
    "Test changes in a staging environment",
    "Monitor performance metrics after implementation",
  );
  if (specificRecs.length === 0) {
    return [
      { step: "Review the audit details for specific recommendations", reports: [] },
      ...tail,
    ];
  }
  return tail;
}

function firstMatchingRule(auditId: string): CategoryRule | undefined {
  return CATEGORY_RULES.find((rule) => rule.match(auditId));
}

export function getCategoryFromAuditId(auditId: string): string {
  return firstMatchingRule(auditId)?.category ?? "Performance";
}

export function getGenericStepsForCategory(
  auditId: string,
  specificRecs: ActionableStep[],
): ActionableStep[] {
  const rule = firstMatchingRule(auditId);
  if (rule) {
    return rule.getSteps();
  }
  return getDefaultSteps(specificRecs);
}

export function getCategoryAndGenericSteps(
  auditId: string,
  specificRecs: ActionableStep[],
): { category: string; genericSteps: ActionableStep[] } {
  const category = getCategoryFromAuditId(auditId);
  const genericSteps = getGenericStepsForCategory(auditId, specificRecs);
  return { category, genericSteps };
}
