export type StreamChunk = {
  /** Arrival time in ms since the request started (first byte of this chunk, or of a merged burst). */
  t: number;
  /** Arrival of the last byte of a merged burst; absent for a single read. */
  end?: number;
  bytes: number;
  /** First characters of the chunk; kept only for notable chunks. */
  preview?: string;
  /** Looks like a late streamed-in boundary (React `$RC(`/`$RS(`/`$RX(`/`$RB(` completion scripts or a hidden `S:` segment div). */
  late?: boolean;
};

export const GAP_THRESHOLD_MS = 100;
export const COALESCE_MS = 5;
export const PREVIEW_CHARS = 80;

/** React boundary-completion markers only. Plain `<template>` elements and the empty `<template id="B:n">` placeholders in the shell are not late content. */
export const LATE_MARKER_SOURCE = String.raw`\$R[CSXB]\(|<div hidden id="S:`;
/** Longest marker (18 chars) minus one: the most of it that can sit in an earlier read. */
export const LATE_TAIL_CHARS = 17;

/** True if a marker ends inside `text`; a marker fully inside `previousTail` was already counted. */
export function isLateChunk(text: string, previousTail = ""): boolean {
  const re = new RegExp(LATE_MARKER_SOURCE, "g");
  const all = previousTail + text;
  for (let m = re.exec(all); m; m = re.exec(all)) {
    if (m.index + m[0].length > previousTail.length) return true;
  }
  return false;
}

/** Add a chunk, merging it into the previous one when it arrives within COALESCE_MS. */
export function appendChunk(chunks: StreamChunk[], c: StreamChunk, cutoff = COALESCE_MS - 0.001): void {
  const head = chunks[chunks.length - 1];
  if (head && c.t - (head.end ?? head.t) <= cutoff) {
    head.bytes += c.bytes;
    head.end = Math.max(head.end ?? head.t, c.end ?? c.t);
    // A late (Suspense) chunk's content wins the preview so the gap hint points at the right content.
    if (c.late && !head.late && c.preview) head.preview = c.preview;
    else head.preview ??= c.preview;
    head.late = head.late || c.late;
  } else {
    chunks.push({ ...c });
  }
}

export function makePreview(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, PREVIEW_CHARS);
}
