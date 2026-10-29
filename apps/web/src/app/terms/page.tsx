import type { Metadata } from "next";

import { PRIVACY_ISSUES_URL, LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service | Web Performance Report",
  description: "Terms governing use of Web Performance Report.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        By using Web Performance Report (&quot;the Service&quot;) you agree to these terms. If you
        do not agree, do not use the Service.
      </p>

      <h2>Use of the Service</h2>
      <ul>
        <li>Use the Service only for lawful purposes and only on URLs you are permitted to test.</li>
        <li>
          Do not attempt to overload, scrape at abusive rates, probe, or disrupt the Service, or
          circumvent rate limits.
        </li>
        <li>Do not use the Service to analyze internal, private, or unauthorized networks.</li>
      </ul>

      <h2>Data sources</h2>
      <p>
        Results come from Google&apos;s Chrome UX Report and PageSpeed Insights / Lighthouse. Their
        accuracy and availability are outside our control, and use of that data is subject to
        Google&apos;s terms.
      </p>

      <h2>No warranty</h2>
      <p>
        The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of
        any kind. Performance scores and recommendations are informational and may be inaccurate or
        incomplete.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, we are not liable for any indirect, incidental, or
        consequential damages arising from your use of the Service.
      </p>

      <h2>Changes and termination</h2>
      <p>
        We may modify or discontinue the Service, or restrict access, at any time. Continued use
        after changes means you accept the updated terms.
      </p>

      <h2>Privacy</h2>
      <p>
        See our <a href="/privacy">Privacy Policy</a> for how data is handled.
      </p>

      <h2>Contact</h2>
      <p>
        Open a{" "}
        <a href={PRIVACY_ISSUES_URL} target="_blank" rel="noopener noreferrer">
          GitHub issue
        </a>
        .
      </p>
    </LegalPage>
  );
}
