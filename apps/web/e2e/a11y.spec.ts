import { readFileSync } from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const report = JSON.stringify(
  (
    JSON.parse(
      readFileSync(
        path.join(process.cwd(), "src/features/page-speed-insights/example-report.json"),
        "utf8",
      ),
    ) as { item: unknown }[]
  ).map((entry) => entry.item),
);

// Pre-existing violations tracked for follow-up; remove entries as they are fixed.
const KNOWN: Record<string, string[]> = {
  "/page-speed/e2e-public-id": ["aria-valid-attr-value", "label-content-name-mismatch"],
};

const routes = ["/", "/page-speed", "/page-speed/e2e-public-id", "/lh", "/viewer"];

for (const route of routes) {
  test(`a11y: no critical/serious violations on ${route}`, async ({ page }, testInfo) => {
    test.setTimeout(180_000); // axe on the full dashboard is slow under next dev
    await page.route("**/api/pagespeed/e2e-public-id", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: report }),
    );
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    if (route.startsWith("/page-speed/")) {
      await expect(page.getByText("Core Web Vitals Summary")).toBeVisible({ timeout: 30_000 });
    }

    const { violations } = await new AxeBuilder({ page }).analyze();
    const summary = violations.map((v) => `${v.impact} ${v.id} (${v.nodes.length})`);
    await testInfo.attach("axe-violations", { body: summary.join("\n") || "none" });
    console.log(`[axe] ${route}: ${summary.join("; ") || "none"}`);

    const blocking = violations.filter(
      (v) => (v.impact === "critical" || v.impact === "serious") && !KNOWN[route]?.includes(v.id),
    );
    expect(blocking.map((v) => v.id)).toEqual([]);
  });
}
