// Port of Lighthouse Lantern TCPConnection (times in ms).

export interface ConnectionTiming {
  dnsResolutionTime?: number;
  connectionTime?: number;
  sslTime?: number;
  timeToFirstByte: number;
}

interface DownloadOptions {
  dnsResolutionTime?: number;
  timeAlreadyElapsed?: number;
  maximumTimeToElapse?: number;
}

export interface DownloadResults {
  roundTrips: number;
  timeElapsed: number;
  bytesDownloaded: number;
  extraBytesDownloaded: number;
  congestionWindow: number;
  connectionTiming: ConnectionTiming;
}

const INITIAL_CONGESTION_WINDOW = 10;
const TCP_SEGMENT_SIZE = 1460;

export class TCPConnection {
  warmed = false;
  congestionWindowSegments = INITIAL_CONGESTION_WINDOW;
  h2OverflowBytesDownloaded = 0;

  constructor(
    public rtt: number,
    public throughput: number,
    public serverLatency = 0,
    public ssl = true,
    public multiplexed = false,
  ) {}

  static maximumSaturatedConnections(rtt: number, availableThroughput: number): number {
    const roundTripsPerSecond = 1000 / rtt;
    const bytesPerSecond = roundTripsPerSecond * TCP_SEGMENT_SIZE;
    const minimumThroughputRequiredPerRequest = bytesPerSecond * 8;
    return Math.floor(availableThroughput / minimumThroughputRequiredPerRequest);
  }

  computeMaximumCongestionWindowInSegments(): number {
    const bytesPerSecond = this.throughput / 8;
    const secondsPerRoundTrip = this.rtt / 1000;
    return Math.floor((bytesPerSecond * secondsPerRoundTrip) / TCP_SEGMENT_SIZE);
  }

  setThroughput(throughput: number): void {
    this.throughput = throughput;
  }

  setCongestionWindow(congestion: number): void {
    this.congestionWindowSegments = congestion;
  }

  setWarmed(warmed: boolean): void {
    this.warmed = warmed;
  }

  isMultiplexed(): boolean {
    return this.multiplexed;
  }

  get congestionWindow(): number {
    return this.congestionWindowSegments;
  }

  setH2OverflowBytesDownloaded(bytes: number): void {
    if (!this.multiplexed) return;
    this.h2OverflowBytesDownloaded = bytes;
  }

  clone(): TCPConnection {
    return Object.assign(new TCPConnection(this.rtt, this.throughput), this);
  }

  simulateDownloadUntil(bytesToDownload: number, options?: DownloadOptions): DownloadResults {
    const {
      timeAlreadyElapsed = 0,
      maximumTimeToElapse = Infinity,
      dnsResolutionTime = 0,
    } = options || {};

    if (this.multiplexed) {
      bytesToDownload -= this.h2OverflowBytesDownloaded;
    }
    const twoWayLatency = this.rtt;
    const oneWayLatency = twoWayLatency / 2;
    const maximumCongestionWindow = this.computeMaximumCongestionWindowInSegments();

    let handshakeAndRequest = oneWayLatency;
    if (!this.warmed) {
      handshakeAndRequest =
        dnsResolutionTime +
        oneWayLatency +
        oneWayLatency +
        oneWayLatency +
        (this.ssl ? twoWayLatency : 0);
    }

    let roundTrips = Math.ceil(handshakeAndRequest / twoWayLatency);
    let timeToFirstByte = handshakeAndRequest + this.serverLatency + oneWayLatency;
    if (this.warmed && this.multiplexed) {
      timeToFirstByte = 0;
    }

    const timeElapsedForTTFB = Math.max(timeToFirstByte - timeAlreadyElapsed, 0);
    const maximumDownloadTimeToElapse = maximumTimeToElapse - timeElapsedForTTFB;

    let congestionWindow = Math.min(this.congestionWindowSegments, maximumCongestionWindow);
    let totalBytesDownloaded = 0;
    if (timeElapsedForTTFB > 0) {
      totalBytesDownloaded = congestionWindow * TCP_SEGMENT_SIZE;
    } else {
      roundTrips = 0;
    }

    let downloadTimeElapsed = 0;
    let bytesRemaining = bytesToDownload - totalBytesDownloaded;
    while (bytesRemaining > 0 && downloadTimeElapsed <= maximumDownloadTimeToElapse) {
      roundTrips++;
      downloadTimeElapsed += twoWayLatency;
      congestionWindow = Math.max(Math.min(maximumCongestionWindow, congestionWindow * 2), 1);

      const bytesDownloadedInWindow = congestionWindow * TCP_SEGMENT_SIZE;
      totalBytesDownloaded += bytesDownloadedInWindow;
      bytesRemaining -= bytesDownloadedInWindow;
    }

    const timeElapsed = timeElapsedForTTFB + downloadTimeElapsed;
    const extraBytesDownloaded = this.multiplexed
      ? Math.max(totalBytesDownloaded - bytesToDownload, 0)
      : 0;
    const bytesDownloaded = Math.max(Math.min(totalBytesDownloaded, bytesToDownload), 0);

    let connectionTiming: ConnectionTiming;
    if (!this.warmed) {
      connectionTiming = {
        dnsResolutionTime,
        connectionTime: handshakeAndRequest - dnsResolutionTime,
        sslTime: this.ssl ? twoWayLatency : undefined,
        timeToFirstByte,
      };
    } else if (this.multiplexed) {
      connectionTiming = { timeToFirstByte };
    } else {
      connectionTiming = { connectionTime: handshakeAndRequest, timeToFirstByte };
    }

    return {
      roundTrips,
      timeElapsed,
      bytesDownloaded,
      extraBytesDownloaded,
      congestionWindow,
      connectionTiming,
    };
  }
}
