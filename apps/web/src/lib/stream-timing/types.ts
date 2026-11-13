import type { StreamChunk } from "@maxwellcohen/stream-core";

export type { StreamChunk };

export type StreamMeasurement = {
  url: string;
  finalUrl?: string;
  status: number;
  contentType?: string;
  contentEncoding?: string;
  /** Where the fetch ran. Server timings reflect the server's network, not the user's. */
  measuredFrom: "server" | "local";
  startedAt: string;
  /** Response headers received, ms since request start. */
  headersMs: number;
  /** Stream ended, ms since request start. */
  totalMs: number;
  chunks: StreamChunk[];
  /** Arrival of the true last byte; kept when chunks are coalesced. */
  lastByteMs?: number;
  /** Redirect hops followed before the measured response. */
  redirects?: number;
  /** The body was cut off (size cap), so bytes and last byte are incomplete. */
  truncated?: boolean;
  /** Chunks were merged to bound the size; timings between bursts are preserved. */
  coalesced?: boolean;
};

export type StreamGap = {
  /** Index into chunks of the chunk that ended the gap. */
  beforeIndex: number;
  fromMs: number;
  toMs: number;
  durationMs: number;
  /** Preview of the chunk that finally arrived. */
  next?: string;
};

export type StreamAnalysis = {
  ttfbMs: number;
  firstChunkMs: number;
  lastByteMs: number;
  /** lastByte - firstChunk: how long the body took to finish after it began. */
  streamSpanMs: number;
  totalBytes: number;
  chunkCount: number;
  streamed: boolean;
  gapThresholdMs: number;
  gaps: StreamGap[];
  /** Sum of gaps >= threshold. */
  idleMs: number;
  idlePct: number;
  longestGapMs: number;
  lateChunkCount: number;
};
