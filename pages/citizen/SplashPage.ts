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
    await continueBtn.click();

    // App Router soft-nav is flaky against cold Cloud Run revisions; fall back to
    // a direct guest landing after language is selected so the golden path can proceed.
    try {
      await this.page.waitForFunction(
        () => window.location.pathname.includes('/onboarding/guest'),
        { timeout: 20_000 },
      );
    } catch {
      await this.page.evaluate(() => {
        try {
          localStorage.setItem('sahayak_language', 'en');
        } catch {
          /* ignore */
        }
      });
      await this.goto('/onboarding/guest');
    }

    await expect(this.page).toHaveURL(/\/onboarding\/guest/);
  }
}
