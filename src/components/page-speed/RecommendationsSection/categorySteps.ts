import type { ActionableStep } from './types';

export function getCategoryFromAuditId(auditId: string): string {
  if (auditId.includes('render-blocking') || auditId.includes('render-blocking-resources')) {
    return 'Render Blocking';
  }
  if (auditId.includes('unused') && auditId.includes('javascript')) {
    return 'JavaScript';
  }
  if (auditId.includes('unused') && auditId.includes('css')) {
    return 'CSS';
  }
  if (auditId.includes('image') || auditId.includes('offscreen-images')) {
    return 'Images';
  }
  if (auditId.includes('javascript') && auditId.includes('execution')) {
    return 'JavaScript';
  }
  if (auditId.includes('server-response-time') || auditId.includes('ttfb')) {
    return 'Server';
  }
  if (auditId.includes('preload') || auditId.includes('preconnect')) {
    return 'Resource Hints';
  }
  if (auditId.includes('font') || auditId.includes('text')) {
    return 'Fonts';
  }
  if (auditId.includes('redirect')) {
    return 'Network';
  }
  if (auditId.includes('total-byte-weight') || auditId.includes('network')) {
    return 'Network';
  }
  return 'Performance';
}

function getRenderBlockingSteps(): ActionableStep[] {
  return [
    { step: 'Defer non-critical CSS and JavaScript', reports: [] },
    { step: 'Inline critical CSS', reports: [] },
    { step: 'Use `preload` for critical resources', reports: [] },
    { step: 'Remove unused CSS and JavaScript', reports: [] },
  ];
}

function getJavaScriptSteps(): ActionableStep[] {
  return [
    { step: 'Use code splitting to load only what you need', reports: [] },
    { step: 'Consider lazy loading for non-critical scripts', reports: [] },
    { step: 'Audit your bundle size regularly', reports: [] },
  ];
}

function getJavaScriptExecutionSteps(): ActionableStep[] {
  return [
    { step: 'Minify and compress JavaScript', reports: [] },
    { step: 'Use code splitting and lazy loading', reports: [] },
    { step: 'Remove unused dependencies', reports: [] },
    { step: 'Consider using lighter alternatives to heavy libraries', reports: [] },
  ];
}

function getCSSSteps(): ActionableStep[] {
  return [
    { step: 'Use CSS purging tools', reports: [] },
    { step: 'Split CSS by page/component', reports: [] },
    { step: 'Consider critical CSS extraction', reports: [] },
  ];
}

function getImageSteps(): ActionableStep[] {
  return [
    { step: 'Use modern image formats (WebP, AVIF)', reports: [] },
    { step: 'Implement lazy loading for below-the-fold images', reports: [] },
    { step: 'Optimize image dimensions to match display size', reports: [] },
    { step: 'Use responsive images with srcset', reports: [] },
    { step: 'Consider using a CDN for image delivery', reports: [] },
  ];
}

function getServerSteps(): ActionableStep[] {
  return [
    { step: 'Use a CDN for static assets', reports: [] },
    { step: 'Enable HTTP/2 or HTTP/3', reports: [] },
    { step: 'Implement server-side caching', reports: [] },
    { step: 'Consider using edge computing', reports: [] },
  ];
}

function getResourceHintsSteps(): ActionableStep[] {
  return [
    { step: 'Preconnect to important third-party origins', reports: [] },
    { step: 'Preload critical fonts and CSS', reports: [] },
  ];
}

function getFontSteps(): ActionableStep[] {
  return [
    { step: 'Use `font-display: swap` for better rendering', reports: [] },
    { step: 'Subset fonts to include only needed characters', reports: [] },
    { step: 'Consider using system fonts for body text', reports: [] },
  ];
}

function getNetworkSteps(): ActionableStep[] {
  return [
    { step: 'Compress assets with gzip or brotli', reports: [] },
    { step: 'Remove unused resources', reports: [] },
    { step: 'Optimize and minify all assets', reports: [] },
  ];
}

function getRedirectSteps(): ActionableStep[] {
  return [
    { step: 'Use direct URLs when possible', reports: [] },
    { step: 'Implement server-side redirects instead of client-side', reports: [] },
  ];
}

function getDefaultSteps(
  specificRecs: ActionableStep[]
): ActionableStep[] {
  const steps: ActionableStep[] = [];
  if (specificRecs.length === 0) {
    steps.push({ step: 'Review the audit details for specific recommendations', reports: [] });
  }
  steps.push(
    { step: 'Test changes in a staging environment', reports: [] },
    { step: 'Monitor performance metrics after implementation', reports: [] },
  );
  return steps;
}

export function getGenericStepsForCategory(
  auditId: string,
  specificRecs: ActionableStep[]
): ActionableStep[] {
  if (auditId.includes('render-blocking') || auditId.includes('render-blocking-resources')) {
    return getRenderBlockingSteps();
  }
  if (auditId.includes('unused') && auditId.includes('javascript')) {
    return getJavaScriptSteps();
  }
  if (auditId.includes('unused') && auditId.includes('css')) {
    return getCSSSteps();
  }
  if (auditId.includes('image') || auditId.includes('offscreen-images')) {
    return getImageSteps();
  }
  if (auditId.includes('javascript') && auditId.includes('execution')) {
    return getJavaScriptExecutionSteps();
  }
  if (auditId.includes('server-response-time') || auditId.includes('ttfb')) {
    return getServerSteps();
  }
  if (auditId.includes('preload') || auditId.includes('preconnect')) {
    return getResourceHintsSteps();
  }
  if (auditId.includes('font') || auditId.includes('text')) {
    return getFontSteps();
  }
  if (auditId.includes('redirect')) {
    return getRedirectSteps();
  }
  if (auditId.includes('total-byte-weight') || auditId.includes('network')) {
    return getNetworkSteps();
  }
  return getDefaultSteps(specificRecs);
}

export function getCategoryAndGenericSteps(
  auditId: string,
  specificRecs: ActionableStep[]
): { category: string; genericSteps: ActionableStep[] } {
  const category = getCategoryFromAuditId(auditId);
  const genericSteps = getGenericStepsForCategory(auditId, specificRecs);
  return { category, genericSteps };
}

