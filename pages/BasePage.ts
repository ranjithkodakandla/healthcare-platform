import { Page, expect } from '@playwright/test';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path: string): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }

  async expectAlive(): Promise<void> {
    await expect(this.page.locator('body')).toBeVisible();
    const title = await this.page.title();
    expect(title.length).toBeGreaterThan(0);
  }

  async shot(name: string): Promise<void> {
    await this.page.screenshot({ path: `test-results/manual-${name}.png`, fullPage: true });
  }
}
