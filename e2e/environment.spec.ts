import { expect, test } from "@playwright/test";

import { SUBMIT_BUTTON, advanceButtonTrials, finishedSummary, flagIds, openFixture } from "./helpers";

/**
 * No masking here: this is a genuine automated browser, and the environment probe should say so.
 */
test.describe("an unmasked automated browser", () => {
  test("is flagged through navigator.webdriver", async ({ page }) => {
    await openFixture(page);

    const webdriver = await page.evaluate(() => navigator.webdriver);
    expect(webdriver).toBe(true);

    await advanceButtonTrials(page, () => page.locator(".jspsych-btn").first().click());
    await page.locator(SUBMIT_BUTTON).click();

    const summary = await finishedSummary(page);
    expect(flagIds(summary)).toContain("webdriver");
    expect(summary.score).toBeGreaterThanOrEqual(0.9);
  });

  test("does not flag a window that only reports 0x0 while loading", async ({ page }) => {
    await openFixture(page);
    await page.locator(".jspsych-btn").first().click();
    await page.waitForTimeout(150);

    const zeroOuter = await page.evaluate(
      () => (window as any).jsPsych?.extensions?.humancheck?.environment?.zero_outer_window,
    );
    expect(zeroOuter === false || zeroOuter === undefined).toBe(true);
  });
});
