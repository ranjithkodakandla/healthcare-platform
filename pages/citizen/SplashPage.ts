import { expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class CitizenSplashPage extends BasePage {
  async open(): Promise<void> {
    await this.goto('/onboarding/splash');
    await expect(this.page.getByText('Sahayak')).toBeVisible({ timeout: 30_000 });
  }

  async continueInEnglish(): Promise<void> {
    const english = this.page.getByRole('radio', { name: /English/i });
    await expect(english).toBeVisible({ timeout: 20_000 });
    await english.click();
    const continueBtn = this.page.getByRole('button', { name: /Continue in English/i });
    await expect(continueBtn).toBeVisible({ timeout: 10_000 });
    await Promise.all([
      this.page.waitForURL(/\/onboarding\/guest/, { timeout: 45_000 }),
      continueBtn.click(),
    ]);
  }
}
