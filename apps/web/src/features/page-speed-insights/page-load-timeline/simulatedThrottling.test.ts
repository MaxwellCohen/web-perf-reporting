import { describe, expect, it } from "vitest";
import {
  createTimelineClock,
  resolveSimulatedThrottling,
} from "./simulatedThrottling";

describe("resolveSimulatedThrottling", () => {
  it("uses PSI mobile and desktop presets when the report omits throttling settings", () => {
    expect(resolveSimulatedThrottling({ formFactor: "mobile" })).toMatchObject({
      rttMs: 150,
      cpuSlowdownMultiplier: 4,
      label: "Slow 4G, 4× CPU",
    });
    expect(
      resolveSimulatedThrottling({ emulatedFormFactor: "desktop" }),
    ).toMatchObject({
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
        throttling: {
          rttMs: 80,
          throughputKbps: 5000,
          cpuSlowdownMultiplier: 2,
        },
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
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
        },
      }),
    ).toBeNull();
    expect(
      resolveSimulatedThrottling({
        throttlingMethod: "provided",
        formFactor: "desktop",
      }),
    ).toBeNull();
    expect(resolveSimulatedThrottling(undefined)).toBeNull();
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

  it("interpolates main-thread tasks and requests between simulated anchors", () => {
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
    expect(task!.startTime).toBeCloseTo(clock.mapTime(1300), 5);
    expect(task!.startTime + task!.duration).toBeCloseTo(
      clock.mapTime(1400),
      5,
    );

    const [image] = clock.adjustRequests([
      {
        url: "https://cdn.example.com/hero.jpg",
        networkRequestTime: 345,
        networkEndTime: 371,
        transferSize: 1_000_000,
        protocol: "h2",
      },
    ]);
    expect(image!.networkRequestTime).toBeCloseTo(clock.mapTime(345), 5);
    // Can't finish faster than the throttled link allows.
    expect(image!.networkEndTime!).toBeGreaterThan(clock.mapTime(371));

    const [large] = clock.adjustRequests([
      {
        url: "https://cdn.example.com/huge.jpg",
        networkRequestTime: 345,
        networkEndTime: 371,
        transferSize: 6_000_000,
        protocol: "h2",
      },
    ]);
    // 6 MB cannot cross 1.6 Mbps in seconds.
    expect(large!.networkEndTime! - large!.networkRequestTime!).toBeGreaterThan(
      20_000,
    );

    const job = (url: string) => ({
      url,
      networkRequestTime: 345,
      networkEndTime: 346,
      transferSize: 200_000,
      protocol: "h2",
    });
    const alone = clock.adjustRequests([
      job("https://cdn.example.com/a.js"),
    ])[0]!;
    const shared = clock.adjustRequests([
      job("https://cdn.example.com/a.js"),
      job("https://cdn.example.com/b.js"),
    ])[0]!;
    expect(shared.networkEndTime!).toBeGreaterThan(alone.networkEndTime! + 500);
  });

  it("rebuilds LCP subparts from the simulated breakdown", () => {
    const clock = createTimelineClock({
      throttling,
      simulatedTtfb: 601,
      simulatedLcp: 19463,
    });
    const parts = clock.adjustLcpSubparts(
      [
        {
          subpart: "timeToFirstByte",
          label: "Time to first byte",
          duration: 1,
        },
        {
          subpart: "resourceLoadDelay",
          label: "Resource load delay",
          duration: 2,
        },
        {
          subpart: "resourceLoadDuration",
          label: "Resource load duration",
          duration: 3,
        },
        {
          subpart: "elementRenderDelay",
          label: "Element render delay",
          duration: 4,
        },
      ],
      {
        simulatedTtfb: 601,
        simulatedLcp: 19463,
        loadDelay: 2224,
        loadDuration: 90,
      },
    );
    expect(parts.map((part) => part.duration)).toEqual([
      601,
      2825 - 601,
      2915 - 2825,
      19463 - 2915,
    ]);
    expect(parts.reduce((sum, part) => sum + part.duration, 0)).toBe(19463);
  });

  it("clamps load phases that overrun LCP so they still sum to LCP", () => {
    const clock = createTimelineClock({
      throttling,
      simulatedTtfb: 601,
      simulatedLcp: 9901,
    });
    const parts = clock.adjustLcpSubparts(
      [
        {
          subpart: "timeToFirstByte",
          label: "Time to first byte",
          duration: 72,
        },
        {
          subpart: "resourceLoadDelay",
          label: "Resource load delay",
          duration: 877,
        },
        {
          subpart: "resourceLoadDuration",
          label: "Resource load duration",
          duration: 23,
        },
        {
          subpart: "elementRenderDelay",
          label: "Element render delay",
          duration: 124,
        },
      ],
      {
        simulatedTtfb: 601,
        simulatedLcp: 9901,
        loadDelay: 7987,
        loadDuration: 196,
      },
    );
    expect(parts.map((part) => part.duration)).toEqual([
      601,
      8588 - 601,
      8784 - 8588,
      9901 - 8784,
    ]);
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
        {
          subpart: "timeToFirstByte",
          label: "Time to first byte",
          duration: 72,
        },
        {
          subpart: "elementRenderDelay",
          label: "Element render delay",
          duration: 6900,
        },
      ],
      { simulatedTtfb: 601, simulatedLcp: 6980 },
    );
    expect(parts.map((part) => part.subpart)).toEqual([
      "timeToFirstByte",
      "elementRenderDelay",
    ]);
    expect(parts[0]?.duration).toBe(601);
    expect(parts[1]?.duration).toBeCloseTo(6980 - 601, 5);
  });

  it("maps desktop tasks onto the same clock as everything else", () => {
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
    const [task] = clock.adjustTasks([{ startTime: 400, duration: 80 }]);
    expect(task!.startTime + task!.duration).toBeCloseTo(clock.mapTime(480), 5);
    expect(clock.mapTime(661)).toBeCloseTo(614, 5);
  });
});
