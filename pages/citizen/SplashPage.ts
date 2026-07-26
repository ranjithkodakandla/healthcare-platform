import { expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class CitizenSplashPage extends BasePage {
  async open(): Promise<void> {
    await this.goto('/onboarding/splash');
    await expect(this.page.getByText('Sahayak')).toBeVisible();
  }

  async continueInEnglish(): Promise<void> {
    await this.page.getByRole('radio', { name: /English/i }).click();
    await this.page.getByRole('button', { name: /Continue in English/i }).click();
  }
}
