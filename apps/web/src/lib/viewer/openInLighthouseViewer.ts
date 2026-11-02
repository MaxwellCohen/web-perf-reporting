const VIEWER_URL = "https://googlechrome.github.io/lighthouse/viewer/";
const VIEWER_ORIGIN = new URL(VIEWER_URL).origin;

/**
 * Opens the official Lighthouse Viewer and hands it the report via the viewer's
 * postMessage protocol: it announces itself to its opener, we reply with `lhresults`.
 */
export function openInLighthouseViewer(lighthouseResult: unknown): boolean {
  const popup = window.open(VIEWER_URL, "_blank");
  if (!popup) return false;

  const cleanup = () => window.removeEventListener("message", onMessage);
  const onMessage = (event: MessageEvent) => {
    if (event.origin !== VIEWER_ORIGIN || event.source !== popup) return;
    popup.postMessage({ lhresults: lighthouseResult }, VIEWER_ORIGIN);
    cleanup();
  };
  window.addEventListener("message", onMessage);
  setTimeout(cleanup, 60_000);
  return true;
}
