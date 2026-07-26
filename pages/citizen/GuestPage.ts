import { expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class CitizenGuestPage extends BasePage {
  async open(): Promise<void> {
    await this.goto('/onboarding/guest');
    await expect(this.page.getByRole('heading', { name: /Need help now/i })).toBeVisible();
  }

  async requestAmbulance(): Promise<void> {
    await this.page.getByRole('button', { name: /Request ambulance/i }).click();
  }

  async continueAsGuest(): Promise<void> {
    await this.page.getByRole('button', { name: /Browse hospitals/i }).click();
  }

  async goToLogin(): Promise<void> {
    await this.page.getByRole('link', { name: /Sign in with mobile/i }).click();
  }
}
