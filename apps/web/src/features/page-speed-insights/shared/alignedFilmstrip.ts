import type { FilmstripMarker } from "@/features/page-speed-insights/shared/filmstripMarkers";

export type AlignedFilmstripInput = {
  frames: Array<{ timing: number; data: string }>;
  markers: FilmstripMarker[];
};

type AlignedFilmstripCell = {
  /** Latest frame painted at or before the column time; null before first paint. */
  frame: { timing: number; data: string } | null;
  /** True when the frame differs from the previous column (visual change). */
  changed: boolean;
  /** Markers that fall in (previous column time, column time]. */
  labels: string[];
};

export type AlignedFilmstrip = {
  stepMs: number;
  times: number[];
  rows: AlignedFilmstripCell[][];
};

const STEP_CANDIDATES_MS = [100, 200, 250, 500, 1000, 2000];

/** Smallest step that keeps the shared axis at or under `maxColumns`. */
function pickStepMs(endMs: number, maxColumns: number): number {
  for (const step of STEP_CANDIDATES_MS) {
    if (Math.ceil(endMs / step) <= maxColumns) return step;
  }
  return STEP_CANDIDATES_MS[STEP_CANDIDATES_MS.length - 1];
}

/**
 * Put several filmstrips on one shared time axis so column N shows every run
 * at the same moment, instead of each run's own frame cadence.
 */
export function buildAlignedFilmstrip(
  strips: AlignedFilmstripInput[],
  maxColumns = 16,
): AlignedFilmstrip {
  const endMs = Math.max(
    0,
    ...strips.flatMap((strip) => [
      ...strip.frames.map((frame) => frame.timing),
      ...strip.markers.map((marker) => marker.timeMs).filter(Number.isFinite),
    ]),
  );
  if (endMs <= 0) return { stepMs: 0, times: [], rows: strips.map(() => []) };

  const stepMs = pickStepMs(endMs, maxColumns);
  const columns = Math.ceil(endMs / stepMs);
  const times = Array.from({ length: columns }, (_, i) => (i + 1) * stepMs);

  const rows = strips.map((strip) => {
    const frames = [...strip.frames].sort((a, b) => a.timing - b.timing);
    let previous: AlignedFilmstripCell["frame"] = null;
    return times.map((time, i) => {
      const prevTime = i === 0 ? -Infinity : times[i - 1];
      let frame: AlignedFilmstripCell["frame"] = null;
      for (const candidate of frames) {
        if (candidate.timing > time) break;
        frame = candidate;
      }
      const labels = strip.markers
        .filter((marker) => marker.timeMs > prevTime && marker.timeMs <= time)
        .map((marker) => marker.label);
      const changed = frame !== null && frame.data !== previous?.data;
      previous = frame;
      return { frame, changed, labels };
    });
  });

  return { stepMs, times, rows };
}
