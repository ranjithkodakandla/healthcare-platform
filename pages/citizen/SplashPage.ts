import { expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class CitizenSplashPage extends BasePage {
  async open(): Promise<void> {
    await this.goto('/onboarding/splash');
    await expect(this.page.getByText('Sahayak')).toBeVisible();
  }

  async continueInEnglish(): Promise<void> {
    const english = this.page.getByRole('radio', { name: /English/i });
    if (await english.count()) {
      await english.click({ timeout: 20_000 });
    }
    await this.page
      .getByRole('button', { name: /Continue in English|Continue|Get started/i })
      .first()
      .click({ timeout: 20_000 });
  }
}
