export type ClsShiftInput = {
  /** ms since trace start */
  time: number;
  score: number;
  hadInput: boolean;
};

/**
 * Groups layout shifts into CLS session windows: a new window starts after a
 * gap of more than 1 s, and a window is capped at 5 s. Shifts with recent input
 * are excluded. Input may be unsorted.
 */
export function clsSessionWindows<T extends ClsShiftInput>(shifts: T[]): T[][] {
  const sorted = shifts
    .filter((s) => !s.hadInput)
    .slice()
    .sort((a, b) => a.time - b.time);
  const windows: T[][] = [];
  let current: T[] | undefined;
  for (const shift of sorted) {
    if (!current) {
      current = [];
      windows.push(current);
    } else {
      const first = current[0];
      const last = current[current.length - 1];
      if (shift.time - last.time > 1000 || shift.time - first.time > 5000) {
        current = [];
        windows.push(current);
      }
    }
    current.push(shift);
  }
  return windows;
}

/** CLS is the worst session window's score, not the sum of every shift. */
export function clsScore(shifts: ClsShiftInput[]): number {
  return clsSessionWindows(shifts).reduce(
    (max, window) => Math.max(max, window.reduce((sum, shift) => sum + shift.score, 0)),
    0,
  );
}
