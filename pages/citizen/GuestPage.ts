import { expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class CitizenGuestPage extends BasePage {
  async open(): Promise<void> {
    await this.goto('/onboarding/guest');
    await expect(this.page.getByRole('heading', { name: /Need help now/i })).toBeVisible({
      timeout: 30_000,
    });
  }

  async requestAmbulance(): Promise<void> {
    // i18n copy: "Request ambulance now"
    const cta = this.page.getByRole('button', { name: /Request ambulance/i }).first();
    await expect(cta).toBeVisible({ timeout: 30_000 });
    await Promise.all([
      this.page.waitForURL(/\/home\/triage/, { timeout: 45_000 }),
      cta.click(),
    ]);
  }

  async continueAsGuest(): Promise<void> {
    await this.page.getByRole('button', { name: /Browse hospitals|Browse services/i }).click();
  }

  async goToLogin(): Promise<void> {
    await this.page.getByRole('link', { name: /Sign in with mobile/i }).click();
    await this.page.waitForURL(/\/onboarding\/otp/, { timeout: 30_000 });
  }
}
