import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const report = JSON.stringify({
  state: "ready",
  data: (
    JSON.parse(
      readFileSync(path.join(process.cwd(), "test-fixtures/example-report.json"), "utf8"),
    ) as { item: unknown }[]
  ).map((entry) => entry.item),
});
const PUBLIC_ID = "e2e-public-id";

// The worker is called server-side by the Next route handler, so mock at the
// browser boundary: the dashboard fetches /api/pagespeed/:publicId.
async function mockReportApi(page: Page) {
  await page.route(`**/api/pagespeed/${PUBLIC_ID}`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: report }),
  );
}

test.describe("smoke", () => {
  test("start page accepts a URL and submits it", async ({ page }) => {
    await page.goto("/page-speed");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Enter an url:").fill("https://example.com");
    await page.getByRole("button", { name: "Submit" }).click();
    // The server-side worker call can't be intercepted from the browser; assert the submit navigated.
    await page.waitForURL(/url=https/);
  });

  test("dashboard renders a mocked report with the field-vs-lab explainer", async ({ page }) => {
    await mockReportApi(page);
    await page.goto(`/page-speed/${PUBLIC_ID}`);
    await expect(page.getByText("Core Web Vitals Summary")).toBeVisible({ timeout: 30_000 });
    const summary = page.getByText("Why do field data and lab results differ?");
    await summary.scrollIntoViewIfNeeded();
    await expect(summary).toBeVisible();
  });
});
