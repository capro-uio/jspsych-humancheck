import { expect, test } from "@playwright/test";

import {
  SUBMIT_BUTTON,
  TEXT_FIELD,
  behaviouralFlags,
  finishedSummary,
  flagIds,
  hideWebdriver,
  openFixture,
} from "./helpers";

/**
 * The false positive guard. A participant who moves a real pointer, clicks off-centre and types
 * with uneven rhythm must come out clean on every engine. If this starts failing, the extension
 * has begun accusing real people.
 *
 * Only the behavioural flags are asserted on: a headless browser genuinely trips the environment
 * probe (no window.chrome, a 0x0 outer window), and pretending otherwise would be testing a lie.
 */
test.describe("a participant behaving like a person", () => {
  test.beforeEach(async ({ page }) => hideWebdriver(page));

  test("collects no behavioural flags", async ({ page }) => {
    await openFixture(page);

    for (let trial = 0; trial < 3; trial += 1) {
      const button = page.locator(".jspsych-btn").nth(trial % 3);
      const box = (await button.boundingBox())!;

      // Approach the target instead of teleporting onto it.
      await page.mouse.move(box.x - 120, box.y - 90);
      await page.mouse.move(box.x - 40, box.y - 30, { steps: 8 });
      await page.mouse.move(box.x + 10, box.y + 6, { steps: 6 });

      // Click off-centre: a person does not land on the exact pixel centre every time.
      await button.click({ position: { x: 11, y: 7 } });
      await page.waitForTimeout(120);
    }

    const field = page.locator(TEXT_FIELD);
    await expect(field).toBeVisible();
    const fieldBox = (await field.boundingBox())!;
    await page.mouse.move(fieldBox.x - 60, fieldBox.y - 40);
    await page.mouse.move(fieldBox.x + 20, fieldBox.y + 10, { steps: 6 });
    await field.click({ position: { x: 14, y: 9 } });

    // Uneven keystroke timing, which is what separates a person from a macro or a paste.
    for (const character of "A desk, a window and a cup of tea") {
      await page.keyboard.type(character);
      await page.waitForTimeout(35 + Math.floor(Math.random() * 110));
    }

    const submit = page.locator(SUBMIT_BUTTON);
    const submitBox = (await submit.boundingBox())!;
    await page.mouse.move(submitBox.x - 50, submitBox.y - 25, { steps: 5 });
    await submit.click({ position: { x: 13, y: 8 } });

    const summary = await finishedSummary(page);
    expect(behaviouralFlags(summary)).toEqual([]);
    expect(summary.trials_observed).toBe(4);

    // Whatever did fire must be an environment signal, never an accusation about behaviour.
    for (const id of flagIds(summary)) {
      expect(["webdriver", "automation_globals", "headless_user_agent", "environment_inconsistent"]).toContain(id);
    }
  });

  test("leaves the hidden honeypot untouched", async ({ page }) => {
    await openFixture(page);

    const honeypotValue = await page.evaluate(
      () => document.querySelector<HTMLInputElement>("#jspsych-humancheck-honeypot")?.value,
    );
    expect(honeypotValue).toBe("");

    await page.locator(".jspsych-btn").first().click({ position: { x: 11, y: 7 } });
    await page.waitForTimeout(150);

    const stillEmpty = await page.evaluate(
      () => document.querySelector<HTMLInputElement>("#jspsych-humancheck-honeypot")?.value,
    );
    expect(stillEmpty).toBe("");
  });
});
