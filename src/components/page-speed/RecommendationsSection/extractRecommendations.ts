import { formatBytes, formatTime } from './utils';
import type { ActionableStep } from './types';

function getResourceName(url: string): string {
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const urlObj = new URL(url);
      const filename = urlObj.pathname.split('/').pop() || urlObj.hostname;
      return filename.length > 50 ? filename.substring(0, 50) + '...' : filename;
    }
    if (url.startsWith('#') || url.startsWith('data:')) {
      return 'inline styles';
    }
    return url.length > 50 ? url.substring(0, 50) + '...' : url;
  } catch {
    return url.length > 50 ? url.substring(0, 50) + '...' : url;
  }
}

export function extractSpecificRecommendations(
  auditId: string,
  items: Array<Record<string, unknown>>,
  audit: { explanation?: string; displayValue?: string },
  reportLabel?: string,
): ActionableStep[] {
  const recommendations: ActionableStep[] = [];
  const reportLabels = reportLabel ? [reportLabel] : [];

  const resourceMap = new Map<string, {
    url: string;
    wastedBytes?: number;
    wastedMs?: number;
    totalBytes?: number;
    wastedPercent?: number;
    scripting?: number;
    scriptParseCompile?: number;
    total?: number;
  }>();

  items.forEach((item) => {
    const url = item.url as string | undefined;
    if (!url || url === 'Unattributable') {
      return;
    }

    const resourceName = getResourceName(url);
    if (!resourceName?.trim() || resourceName === 'js') {
      return;
    }

    const wastedBytes = item.wastedBytes as number | undefined;
    const wastedMs = item.wastedMs as number | undefined;
    const totalBytes = item.totalBytes as number | undefined;
    const wastedPercent = item.wastedPercent as number | undefined;
    const scripting = item.scripting as number | undefined;
    const scriptParseCompile = item.scriptParseCompile as number | undefined;
    const total = item.total as number | undefined;

    const existing = resourceMap.get(resourceName);
    
    if (!existing || (wastedBytes && wastedBytes > (existing.wastedBytes || 0))) {
      resourceMap.set(resourceName, {
        url,
        wastedBytes: Math.max(wastedBytes || 0, existing?.wastedBytes || 0),
        wastedMs: Math.max(wastedMs || 0, existing?.wastedMs || 0),
        totalBytes: Math.max(totalBytes || 0, existing?.totalBytes || 0),
        wastedPercent: Math.max(wastedPercent || 0, existing?.wastedPercent || 0),
        scripting: Math.max(scripting || 0, existing?.scripting || 0),
        scriptParseCompile: Math.max(scriptParseCompile || 0, existing?.scriptParseCompile || 0),
        total: Math.max(total || 0, existing?.total || 0),
      });
    } else if (existing) {
      resourceMap.set(resourceName, {
        ...existing,
        wastedBytes: Math.max(existing.wastedBytes || 0, wastedBytes || 0),
        wastedMs: Math.max(existing.wastedMs || 0, wastedMs || 0),
        totalBytes: Math.max(existing.totalBytes || 0, totalBytes || 0),
        wastedPercent: Math.max(existing.wastedPercent || 0, wastedPercent || 0),
        scripting: Math.max(existing.scripting || 0, scripting || 0),
        scriptParseCompile: Math.max(existing.scriptParseCompile || 0, scriptParseCompile || 0),
        total: Math.max(existing.total || 0, total || 0),
      });
    }
  });

  const topResources = Array.from(resourceMap.entries())
    .map(([resourceName, item]) => {
      const url = item.url;
      // Create markdown link if URL exists
      const resourceLink = url ? `[${resourceName}](${url})` : resourceName;
      
      if (item.wastedBytes && item.wastedBytes > 0) {
        return { step: `Remove ${formatBytes(item.wastedBytes)} of unused code from ${resourceLink}`, reports: reportLabels};
      }
      if (item.wastedMs && item.wastedMs > 0) {
        return { step: `Optimize ${resourceLink} to save ${formatTime(item.wastedMs)}`, reports: reportLabels};
      }
      if (item.wastedPercent && item.wastedPercent > 50) {
        return { step: `Remove ${item.wastedPercent.toFixed(0)}% of unused code from ${resourceLink}`, reports: reportLabels};
      }
      if (item.scripting && item.scripting > 100) {
        return { step: `Reduce JavaScript execution time in ${resourceLink} (${formatTime(item.scripting)} spent on scripting)`, reports: reportLabels};
      }
      if (item.scriptParseCompile && item.scriptParseCompile > 100) {
        return { step: `Optimize script parsing/compilation for ${resourceLink} (${formatTime(item.scriptParseCompile)} spent)`, reports: reportLabels};
      }
      if (item.total && item.total > 500) {
        return { step: `Optimize ${resourceLink} (${formatTime(item.total)} total CPU time)`, reports: reportLabels};
      }
      if (item.totalBytes && item.totalBytes > 0) {
        return { step: `Optimize ${resourceLink} (${formatBytes(item.totalBytes)})`, reports: reportLabels};
      }
      return { step: `Review and optimize ${resourceLink}`, reports: reportLabels};
    })
    .filter((r): r is ActionableStep => r !== null);

  recommendations.push(...topResources);

  if (audit.explanation) {
    const explanation = audit.explanation;
    if (explanation.includes('third-party')) {
      recommendations.push({ step: 'Consider lazy loading or deferring third-party scripts', reports: reportLabels });
    }
    if (explanation.includes('render-blocking')) {
      recommendations.push({ step: 'Defer or async load render-blocking resources', reports: reportLabels });
    }
    if (explanation.includes('unused')) {
      recommendations.push({ step: 'Remove unused code using tree-shaking or code splitting', reports: reportLabels });
    }
  }

  if (audit.displayValue) {
    const displayValue = audit.displayValue;
    const lowerDisplayValue = displayValue.toLowerCase();
    
    if (displayValue.includes('KiB') || displayValue.includes('MiB') || displayValue.includes('B')) {
      recommendations.push({ step: `Potential savings: ${displayValue}`, reports: reportLabels });
    }
    else if (
      /\d+\s*ms/i.test(displayValue) || 
      /\d+\.?\d*\s*s(?!\w)/i.test(displayValue) ||
      lowerDisplayValue.includes('second') ||
      lowerDisplayValue.includes('millisecond')
    ) {
      recommendations.push({ step: `Potential time savings: ${displayValue}`, reports: reportLabels });
    }
  }

  return recommendations;
}

