const VIEWER_URL = "https://googlechrome.github.io/lighthouse/viewer/";
const VIEWER_ORIGIN = new URL(VIEWER_URL).origin;
const HANDOFF_TIMEOUT_MS = 60_000;

let cancelPrevious: (() => void) | undefined;

/**
 * Opens the official Lighthouse Viewer and hands it the report via the viewer's
 * postMessage protocol: it announces itself to its opener, we reply with `lhresults`.
 * Resolves once the report is handed off; rejects if the popup is blocked or the
 * viewer never announces itself. A newer call supersedes (and resolves) an older one.
 */
export function openInLighthouseViewer(lighthouseResult: unknown): Promise<void> {
  cancelPrevious?.();
  cancelPrevious = undefined;

  const popup = window.open(VIEWER_URL, "_blank");
  if (!popup) return Promise.reject(new Error("Allow pop-ups to open the Lighthouse Viewer."));

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      if (cancelPrevious === cancel) cancelPrevious = undefined;
    };
    const cancel = () => {
      cleanup();
      resolve();
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== VIEWER_ORIGIN || event.source !== popup) return;
      popup.postMessage({ lhresults: lighthouseResult }, VIEWER_ORIGIN);
      cleanup();
      resolve();
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("The Lighthouse Viewer didn't respond. Try again."));
    }, HANDOFF_TIMEOUT_MS);

    cancelPrevious = cancel;
    window.addEventListener("message", onMessage);
  });
}
