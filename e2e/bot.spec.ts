import { Page, expect, test } from "@playwright/test";

import {
  SUBMIT_BUTTON,
  TEXT_FIELD,
  advanceButtonTrials,
  finishedSummary,
  flagIds,
  hideWebdriver,
  openFixture,
  plantedCanary,
} from "./helpers";

const syntheticClick = (page: Page, selector: string) =>
  page.evaluate((target) => {
    document
      .querySelector(target)!
      .dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 5, clientY: 5, detail: 1 }));
  }, selector);

/**
 * These runs hide navigator.webdriver on purpose, so the behavioural detectors have to catch the
 * agent on their own rather than riding on the one trivial environment signal.
 */
test.describe("an agent driving the DOM", () => {
  test.beforeEach(async ({ page }) => hideWebdriver(page));

  test("is caught filling the hidden honeypot with the canary word", async ({ page }) => {
    await openFixture(page);
    expect(await plantedCanary(page)).toBe("quokka");

    // Set the value with no input event at all, the way `element.value = "..."` behaves.
    await page.evaluate(() => {
      document.querySelector<HTMLInputElement>("#jspsych-humancheck-honeypot")!.value = "quokka";
    });
    // jsPsych empties the display before the extension's on_finish, so this has to be picked up by
    // the poll while the trial is still on screen.
    await page.waitForTimeout(400);

    await advanceButtonTrials(page, () => syntheticClick(page, ".jspsych-btn"));
    await syntheticClick(page, SUBMIT_BUTTON);

    const summary = await finishedSummary(page);
    expect(flagIds(summary)).toEqual(expect.arrayContaining(["honeypot", "canary"]));
    expect(summary.score).toBeGreaterThan(0.9);
  });

  test("is caught by synthetic clicks and silently inserted text", async ({ page }) => {
    await openFixture(page);
    await advanceButtonTrials(page, () => syntheticClick(page, ".jspsych-btn"));

    await expect(page.locator(TEXT_FIELD)).toBeVisible();
    await page.evaluate((selector) => {
      const input = document.querySelector<HTMLInputElement>(selector)!;
      input.value = "a desk and a window";
      input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
    }, TEXT_FIELD);
    await syntheticClick(page, SUBMIT_BUTTON);

    const ids = flagIds(await finishedSummary(page));
    expect(ids).toContain("untrusted_events");
    expect(ids).toContain("clicks_without_approach");
    expect(ids).toContain("text_without_keys");
  });

  test("is caught typing with a metronome", async ({ page }) => {
    await openFixture(page);
    await advanceButtonTrials(page, () => syntheticClick(page, ".jspsych-btn"));
    await expect(page.locator(TEXT_FIELD)).toBeVisible();

    // Fixed-interval keystrokes: the giveaway is the near-zero variation, not the speed.
    // The gaps are held open by a short busy wait rather than setTimeout, whose jitter under a
    // loaded CI machine is large enough to make a "metronome" look human and flake this test.
    await page.evaluate((selector) => {
      const input = document.querySelector<HTMLInputElement>(selector)!;
      const pause = (ms: number) => {
        const until = performance.now() + ms;
        while (performance.now() < until) {
          /* hold the thread so the gap is exact */
        }
      };
      for (const character of "machine typed sentence") {
        input.value += character;
        input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: character }));
        input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
        pause(25);
      }
    }, TEXT_FIELD);

    await syntheticClick(page, SUBMIT_BUTTON);

    const summary = await finishedSummary(page);
    const typed = await page.evaluate(
      () => window.__data.find((row) => typeof row.humancheck_inter_key_cv === "number"),
    );
    // Asserted directly so a failure reports the rhythm that was actually recorded.
    expect(typed!.humancheck_keydowns as number).toBeGreaterThan(10);
    expect(typed!.humancheck_inter_key_cv as number).toBeLessThan(0.1);
    expect(flagIds(summary)).toContain("robotic_typing");
  });
});
