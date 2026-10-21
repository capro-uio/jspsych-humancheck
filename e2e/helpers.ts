import { Page, expect } from "@playwright/test";

export interface Flag {
  id: string;
  weight: number;
  detail: string;
}

export interface Summary {
  score: number;
  flags: Flag[];
  trials_observed: number;
  checks_observed: number;
}

declare global {
  interface Window {
    __humancheck: Summary;
    __data: Record<string, unknown>[];
  }
}

/**
 * Playwright sets navigator.webdriver on every engine, which would flag every run through the
 * environment probe alone. Hiding it lets a test exercise the behavioural detectors on their own.
 * `environment.spec.ts` deliberately does not call this.
 */
export async function hideWebdriver(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false, configurable: true });
  });
}

export async function openFixture(page: Page): Promise<void> {
  await page.goto("/e2e/fixture.html");
  await expect(page.locator(".jspsych-btn").first()).toBeVisible();
}

export async function finishedSummary(page: Page): Promise<Summary> {
  await expect(page.locator("body[data-finished='true']")).toBeAttached({ timeout: 20_000 });
  return page.evaluate(() => window.__humancheck);
}

export const flagIds = (summary: Summary): string[] => summary.flags.map((flag) => flag.id);

/** The word planted in the hidden instruction on the trial currently on screen. */
export function plantedCanary(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const probe = document.querySelector(".jspsych-humancheck-probe");
    return probe ? (probe.textContent?.match(/word (\w+)/)?.[1] ?? null) : null;
  });
}

export const TEXT_FIELD = "#jspsych-survey-text-0";
export const SUBMIT_BUTTON = "#jspsych-survey-text-next";

/**
 * The survey-text submit button also carries .jspsych-btn, so anything that drives the button
 * trials has to stop as soon as the text trial appears rather than clicking straight through it.
 */
export async function atTextTrial(page: Page): Promise<boolean> {
  return page
    .locator(TEXT_FIELD)
    .isVisible()
    .catch(() => false);
}

export async function advanceButtonTrials(page: Page, click: () => Promise<void>): Promise<void> {
  for (let guard = 0; guard < 10; guard += 1) {
    if (await atTextTrial(page)) return;
    const button = page.locator(".jspsych-btn").first();
    if (!(await button.isVisible().catch(() => false))) return;
    await click();
    await page.waitForTimeout(150);
  }
}

/**
 * Flags that come from how the session was interacted with, as opposed to what the browser says
 * about itself. A headless browser legitimately trips the environment checks, so behaviour is what
 * a human-likeness test can meaningfully assert on.
 */
export const BEHAVIOURAL_FLAGS = [
  "honeypot",
  "canary",
  "attention",
  "untrusted_events",
  "clicks_without_approach",
  "clicks_at_exact_center",
  "text_without_keys",
  "robotic_typing",
  "no_pointer_on_pointer_device",
  "excessive_pastes",
];

export const behaviouralFlags = (summary: Summary): string[] =>
  flagIds(summary).filter((id) => BEHAVIOURAL_FLAGS.includes(id));
