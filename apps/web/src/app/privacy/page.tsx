import type { Metadata } from "next";

import { PRIVACY_ISSUES_URL, LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy | Web Performance Report",
  description: "How Web Performance Report collects, uses, and protects data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        Web Performance Report (&quot;the Service&quot;) lets you look up Chrome UX Report (CrUX)
        data and run PageSpeed Insights / Lighthouse analyses for public URLs. This policy explains
        what we collect and why.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>URLs you submit.</strong> Websites or origins you enter, and the performance
          results returned for them, may be stored to speed up repeat lookups and show historical
          trends. Do not submit URLs containing secrets or personal data.
        </li>
        <li>
          <strong>Lighthouse reports you submit.</strong> Reports sent to the agent API or opened in
          the viewer are processed to generate results. Viewer reports are processed in your
          browser.
        </li>
        <li>
          <strong>Usage analytics.</strong> We use PostHog to collect page views and basic
          interaction events, along with device and browser information. We do not create user
          profiles for anonymous visitors.
        </li>
        <li>
          <strong>Error monitoring.</strong> We use Sentry to collect error reports and performance
          traces, which may include your browser type, IP address, and the page where the error
          occurred.
        </li>
        <li>
          <strong>Server logs.</strong> Our hosting provider (Vercel) logs requests, including IP
          address and user agent, for security and operations.
        </li>
      </ul>

      <h2>How we use information</h2>
      <p>
        To provide and improve the Service, diagnose errors, prevent abuse, and understand which
        features are used. We do not sell personal information or use it for advertising.
      </p>

      <h2>Third parties</h2>
      <p>
        URLs you submit are sent to Google (PageSpeed Insights and CrUX APIs) to retrieve results.
        Data is also processed by our infrastructure and analytics providers: Vercel, Cloudflare,
        PostHog, and Sentry. Each processes data under its own privacy policy.
      </p>

      <h2>Cookies and local storage</h2>
      <p>
        The Service does not set cookies or write to local storage for analytics or tracking.
        PostHog runs in memory-only mode, so identifiers disappear when you close or reload the
        tab. Sentry error reporting does not use cookies either.
      </p>

      <h2>Retention</h2>
      <p>
        Cached performance data is kept as long as it is useful for historical trends. Analytics and
        error data are retained according to our providers&apos; standard retention periods.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live, you may have the right to access, correct, delete, or export
        your personal data, or to object to its processing. To make a request, contact us below.
      </p>

      <h2>Children</h2>
      <p>The Service is not directed to children under 13 and we do not knowingly collect their data.</p>

      <h2>Changes</h2>
      <p>We may update this policy; the date above reflects the latest revision.</p>

      <h2>Contact</h2>
      <p>
        Open a{" "}
        <a href={PRIVACY_ISSUES_URL} target="_blank" rel="noopener noreferrer">
          GitHub issue
        </a>{" "}
        for privacy questions or requests. Issues are public, so do not include personal or
        sensitive information; we will ask for any needed details through a safer channel.
      </p>
    </LegalPage>
  );
}
