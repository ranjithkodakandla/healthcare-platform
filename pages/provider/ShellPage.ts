import { expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class ProviderShellPage extends BasePage {
  async open(path: string): Promise<void> {
    await this.goto(path);
    await this.expectAlive();
  }

  async expectSidebar(): Promise<void> {
    await expect(this.page.getByRole('link', { name: /Dashboard/i }).first()).toBeVisible({
      timeout: 15_000,
    });
  }

  async go(path: string): Promise<void> {
    await this.goto(path);
  }
}
