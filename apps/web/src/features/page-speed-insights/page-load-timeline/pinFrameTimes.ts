/**
 * Lighthouse's screenshot thumbnails come from evenly spaced slots. A slot's
 * `timing` is the slot time, and its image is the latest frame captured at or
 * before it. So when the image changes between two slots, the change happened
 * somewhere in (previous slot, this slot].
 *
 * The first changed frame is the first visual change and the last changed frame is
 * the last visual change, so pin those to Lighthouse's observed times when they fall
 * inside the window. Any other changed frame goes to the middle of its window. That
 * way a frame isn't shown later than the moment its content appeared.
 */
export function pinFrameChangeTimes<T extends { timing: number; data: string }>(
  frames: T[],
  visualChange: { first?: number; last?: number },
): T[] {
  const changed = frames
    .map((frame, index) => (index > 0 && frame.data !== frames[index - 1]!.data ? index : -1))
    .filter((index) => index >= 0);
  const firstChanged = changed[0];
  const lastChanged = changed[changed.length - 1];

  return frames.map((frame, index) => {
    if (!changed.includes(index)) return frame;
    const previous = frames[index - 1]!.timing;
    const inWindow = (value: number | undefined): value is number =>
      value != null && Number.isFinite(value) && value > previous && value <= frame.timing;

    let timing = (previous + frame.timing) / 2;
    if (index === firstChanged && inWindow(visualChange.first)) timing = visualChange.first;
    else if (index === lastChanged && inWindow(visualChange.last)) timing = visualChange.last;
    return { ...frame, timing };
  });
}
