import { describe, expect, it } from "vitest";
import {
  createTimelineClock,
  resolveSimulatedThrottling,
  simulatedTransferMs,
} from "./simulatedThrottling";

describe("resolveSimulatedThrottling", () => {
  it("uses PSI mobile and desktop presets when the report omits throttling settings", () => {
    expect(resolveSimulatedThrottling({ formFactor: "mobile" })).toMatchObject({
      rttMs: 150,
      cpuSlowdownMultiplier: 4,
      label: "Slow 4G, 4× CPU",
    });
    expect(resolveSimulatedThrottling({ emulatedFormFactor: "desktop" })).toMatchObject({
      rttMs: 40,
      cpuSlowdownMultiplier: 1,
      label: "desktop network, 1× CPU",
    });
  });

  it("prefers explicit throttling settings", () => {
    expect(
      resolveSimulatedThrottling({
        formFactor: "mobile",
        throttlingMethod: "simulate",
        throttling: { rttMs: 80, throughputKbps: 5000, cpuSlowdownMultiplier: 2 },
      }),
    ).toMatchObject({
      rttMs: 80,
      throughputKbps: 5000,
      cpuSlowdownMultiplier: 2,
    });
  });

  it("skips reports whose trace already includes throttling", () => {
    expect(
      resolveSimulatedThrottling({
        formFactor: "mobile",
        throttlingMethod: "devtools",
        throttling: { rttMs: 150, throughputKbps: 1638.4, cpuSlowdownMultiplier: 4 },
      }),
    ).toBeNull();
    expect(
      resolveSimulatedThrottling({ throttlingMethod: "provided", formFactor: "desktop" }),
    ).toBeNull();
    expect(resolveSimulatedThrottling(undefined)).toBeNull();
  });
});

describe("simulatedTransferMs", () => {
  it("makes a large download much slower on Slow 4G than a small one", () => {
    const shared = {
      rttMs: 150,
      throughputKbps: 1.6 * 1024,
      serverLatencyMs: 0,
      cold: false,
      ssl: true,
      h2: true,
    };
    const small = simulatedTransferMs({ ...shared, bytes: 10_000 });
    const large = simulatedTransferMs({ ...shared, bytes: 1_000_000 });
    expect(large).toBeGreaterThan(small);
    expect(large).toBeGreaterThan(1000);
  });

  it("adds connection setup and server time for a cold document", () => {
    const duration = simulatedTransferMs({
      bytes: 70_973,
      rttMs: 150,
      throughputKbps: 1.6 * 1024,
      serverLatencyMs: 94,
      cold: true,
      ssl: true,
      h2: true,
    });
    expect(duration).toBeGreaterThan(94 + 150);
  });
});

describe("createTimelineClock", () => {
  const throttling = resolveSimulatedThrottling({ formFactor: "mobile" })!;

  it("pins TTFB and FCP and places a shared LCP time on the simulated LCP", () => {
    const clock = createTimelineClock({
      throttling,
      observedTtfb: 95,
      simulatedTtfb: 601,
      observedFcp: 2481,
      simulatedFcp: 2819,
      observedLcp: 2481,
      simulatedLcp: 19463,
    });

    expect(clock.mapTime(0)).toBe(0);
    expect(clock.mapTime(95)).toBeCloseTo(601, 5);
    expect(clock.mapTime(2481)).toBeCloseTo(2819, 5);
    // First (simLcp − simFcp) / cpu of observed time after paint fills the FCP→LCP gap.
    expect(clock.mapTime(3000)).toBeGreaterThan(2819);
    expect(clock.mapTime(3000)).toBeLessThan(19463);
    expect(clock.mapTime(8000)).toBeGreaterThan(19463);
  });

  it("multiplies main-thread tasks by the CPU slowdown and stretches large responses", () => {
    const clock = createTimelineClock({
      throttling,
      observedTtfb: 95,
      simulatedTtfb: 601,
      observedFcp: 2481,
      simulatedFcp: 2819,
      observedLcp: 2481,
      simulatedLcp: 19463,
      documentServerLatencyMs: 94,
    });

    const [task] = clock.adjustTasks([{ startTime: 1300, duration: 100 }]);
    expect(task?.duration).toBe(400);
    expect(task!.startTime).toBeGreaterThan(1300);

    const [image] = clock.adjustRequests([
      {
        url: "https://cdn.example.com/hero.jpg",
        networkRequestTime: 345,
        networkEndTime: 371,
        transferSize: 1_000_000,
        protocol: "h2",
      },
    ]);
    expect(image!.networkEndTime! - image!.networkRequestTime!).toBeGreaterThan(371 - 345);
  });

  it("rebuilds LCP subparts from the simulated breakdown", () => {
    const clock = createTimelineClock({
      throttling,
      simulatedTtfb: 601,
      simulatedLcp: 19463,
    });
    const parts = clock.adjustLcpSubparts(
      [
        { subpart: "timeToFirstByte", label: "Time to first byte", duration: 1 },
        { subpart: "resourceLoadDelay", label: "Resource load delay", duration: 2 },
        { subpart: "resourceLoadDuration", label: "Resource load duration", duration: 3 },
        { subpart: "elementRenderDelay", label: "Element render delay", duration: 4 },
      ],
      { simulatedTtfb: 601, simulatedLcp: 19463, loadDelay: 2825, loadDuration: 2915 },
    );
    expect(parts.map((part) => part.duration)).toEqual([
      601,
      2825 - 601,
      2915 - 2825,
      19463 - 2915,
    ]);
    expect(parts.reduce((sum, part) => sum + part.duration, 0)).toBe(19463);
  });

  it("turns load start and finish times that pass LCP into phases that sum to LCP", () => {
    const clock = createTimelineClock({
      throttling,
      simulatedTtfb: 601,
      simulatedLcp: 9901,
    });
    const parts = clock.adjustLcpSubparts(
      [
        { subpart: "timeToFirstByte", label: "Time to first byte", duration: 72 },
        { subpart: "resourceLoadDelay", label: "Resource load delay", duration: 877 },
        { subpart: "resourceLoadDuration", label: "Resource load duration", duration: 23 },
        { subpart: "elementRenderDelay", label: "Element render delay", duration: 124 },
      ],
      { simulatedTtfb: 601, simulatedLcp: 9901, loadDelay: 8588, loadDuration: 8784 },
    );
    expect(parts.map((part) => part.duration)).toEqual([601, 8588 - 601, 8784 - 8588, 9901 - 8784]);
    expect(parts.reduce((sum, part) => sum + part.duration, 0)).toBe(9901);
  });

  it("uses the simulated first byte when a text LCP has no resource phases", () => {
    const clock = createTimelineClock({
      throttling,
      simulatedTtfb: 601,
      simulatedLcp: 6980,
    });
    const parts = clock.adjustLcpSubparts(
      [
        { subpart: "timeToFirstByte", label: "Time to first byte", duration: 72 },
        { subpart: "elementRenderDelay", label: "Element render delay", duration: 6900 },
      ],
      { simulatedTtfb: 601, simulatedLcp: 6980 },
    );
    expect(parts.map((part) => part.subpart)).toEqual(["timeToFirstByte", "elementRenderDelay"]);
    expect(parts[0]?.duration).toBe(601);
    expect(parts[1]?.duration).toBeCloseTo(6980 - 601, 5);
  });

  it("does not slow CPU tasks on the desktop preset", () => {
    const desktop = resolveSimulatedThrottling({ formFactor: "desktop" })!;
    const clock = createTimelineClock({
      throttling: desktop,
      observedTtfb: 40,
      simulatedTtfb: 163,
      observedFcp: 661,
      simulatedFcp: 614,
      observedLcp: 661,
      simulatedLcp: 1743,
    });
    expect(clock.adjustTasks([{ startTime: 400, duration: 80 }])[0]?.duration).toBe(80);
    expect(clock.mapTime(661)).toBeCloseTo(614, 5);

    const [first, second] = clock.adjustTasks([
      { startTime: 400, duration: 80 },
      { startTime: 480, duration: 80 },
    ]);
    expect(second!.startTime).toBeGreaterThanOrEqual(first!.startTime + first!.duration);
  });

  it("queues the next main-thread task when CPU slowdown outgrows the trace gap", () => {
    const clock = createTimelineClock({
      throttling,
      observedTtfb: 26.423,
      simulatedTtfb: 601,
      observedFcp: 2429,
      simulatedFcp: 2265,
      observedLcp: 2429,
      simulatedLcp: 6976,
    });

    const [first, second] = clock.adjustTasks([
      { startTime: 900.034, duration: 98.597 },
      { startTime: 1072.601, duration: 353.231 },
    ]);

    expect(first!.duration).toBeCloseTo(394.388, 3);
    expect(second!.duration).toBeCloseTo(1412.924, 3);
    expect(clock.mapTime(1072.601)).toBeLessThan(first!.startTime + first!.duration);
    expect(second!.startTime).toBeGreaterThanOrEqual(first!.startTime + first!.duration);
  });
});
