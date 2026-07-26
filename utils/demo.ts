import { Page } from '@playwright/test';

/** Human-paced helpers for stakeholder demo recordings. */
export async function demoPause(page: Page, ms = 1200): Promise<void> {
  await page.waitForTimeout(ms);
}

export async function demoScroll(page: Page, y = 400): Promise<void> {
  await page.mouse.wheel(0, y);
  await demoPause(page, 800);
}

export async function demoHighlight(page: Page, selector: string): Promise<void> {
  const loc = page.locator(selector).first();
  if ((await loc.count()) === 0) return;
  await loc.scrollIntoViewIfNeeded().catch(() => undefined);
  const box = await loc.boundingBox();
  if (!box) return;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 18 });
  await demoPause(page, 900);
}

export async function demoClick(page: Page, name: string | RegExp): Promise<void> {
  const btn = page.getByRole('button', { name }).or(page.getByRole('link', { name })).first();
  await btn.scrollIntoViewIfNeeded();
  const box = await btn.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 16 });
    await demoPause(page, 500);
  }
  await btn.click();
  await demoPause(page, 1000);
}

export async function demoShot(page: Page, label: string): Promise<void> {
  await page.screenshot({
    path: `test-results/demo-stills/${label}.png`,
    fullPage: true,
  });
  await demoPause(page, 600);
}
