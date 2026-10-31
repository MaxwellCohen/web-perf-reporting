class PsiShareExtractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PsiShareExtractError";
  }
}

export type PsiEmbeddedLighthouse = {
  lighthouseVersion: string;
  audits: Record<string, unknown>;
  categories: Record<string, unknown>;
  configSettings?: {
    formFactor?: string;
    emulatedFormFactor?: string;
  };
};

const LIGHTHOUSE_NEEDLE = '\\"lighthouseVersion\\"';
const STRING_START_MARKERS = [
  '"{\\"fetchTime\\"',
  '"{\\"requestedUrl\\"',
  '"{\\"finalUrl\\"',
  '"{\\"lighthouseVersion\\"',
];

function looksLikeLighthouse(value: unknown): value is PsiEmbeddedLighthouse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as PsiEmbeddedLighthouse;
  return (
    typeof candidate.lighthouseVersion === "string" &&
    !!candidate.audits &&
    typeof candidate.audits === "object" &&
    !!candidate.categories &&
    typeof candidate.categories === "object"
  );
}

function candidateStarts(html: string, needleIndex: number): number[] {
  const starts: number[] = [];
  for (const marker of STRING_START_MARKERS) {
    const start = html.lastIndexOf(marker, needleIndex);
    if (start !== -1 && needleIndex - start < 2_000_000 && !starts.includes(start)) {
      starts.push(start);
    }
  }

  const generic = html.lastIndexOf('"{\\', needleIndex);
  if (generic !== -1 && needleIndex - generic < 5_000 && !starts.includes(generic)) {
    starts.push(generic);
  }

  return starts;
}

function findStringEnd(html: string, startQuote: number): number {
  let index = startQuote + 1;
  while (index < html.length) {
    const char = html[index];
    if (char === "\\") {
      index += 2;
      continue;
    }
    if (char === '"') return index + 1;
    index += 1;
  }
  return -1;
}

function parseEmbeddedLiteral(literal: string): PsiEmbeddedLighthouse | null {
  try {
    const decoded: unknown = JSON.parse(literal);
    const lighthouse = typeof decoded === "string" ? JSON.parse(decoded) : decoded;
    return looksLikeLighthouse(lighthouse) ? lighthouse : null;
  } catch {
    return null;
  }
}

export function extractLighthouseFromPsiShareHtml(html: string): PsiEmbeddedLighthouse[] {
  if (!html.trim()) {
    throw new PsiShareExtractError("Share page HTML is empty");
  }

  const reports: PsiEmbeddedLighthouse[] = [];
  const seenStarts = new Set<number>();
  let searchFrom = 0;

  while (searchFrom < html.length) {
    const needleIndex = html.indexOf(LIGHTHOUSE_NEEDLE, searchFrom);
    if (needleIndex === -1) break;

    let extractedEnd = -1;
    for (const start of candidateStarts(html, needleIndex)) {
      if (start < searchFrom || seenStarts.has(start)) continue;
      const end = findStringEnd(html, start);
      if (end === -1) continue;
      const report = parseEmbeddedLiteral(html.slice(start, end));
      if (!report) continue;
      seenStarts.add(start);
      reports.push(report);
      extractedEnd = end;
      break;
    }

    searchFrom = extractedEnd === -1 ? needleIndex + LIGHTHOUSE_NEEDLE.length : extractedEnd;
  }

  if (reports.length === 0) {
    throw new PsiShareExtractError(
      "Could not find an embedded Lighthouse result in this share page",
    );
  }

  return reports;
}

export function labelForPsiLighthouse(report: PsiEmbeddedLighthouse, index: number): string {
  const raw = report.configSettings?.formFactor || report.configSettings?.emulatedFormFactor || "";
  const formFactor = raw.toLowerCase();
  if (formFactor === "mobile" || formFactor === "phone") return "Mobile";
  if (formFactor === "desktop") return "Desktop";
  return `Report ${index + 1}`;
}
