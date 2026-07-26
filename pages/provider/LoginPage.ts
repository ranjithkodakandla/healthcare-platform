import { expect } from '@playwright/test';
import { BasePage } from '../BasePage';
import { env } from '../../utils/env';

export class ProviderLoginPage extends BasePage {
  async open(): Promise<void> {
    await this.goto('/login');
    await expect(this.page.getByRole('heading', { name: /Provider Portal/i })).toBeVisible();
  }

  async login(
    email = env.providerEmail,
    password = env.providerPassword,
    hospitalId = env.providerHospitalId,
  ): Promise<void> {
    await this.page.getByRole('button', { name: 'Hospital' }).click();
    const org = this.page.locator('input').nth(0);
    await org.fill(hospitalId);
    await this.page.getByPlaceholder('admissions@apollo-blr.in').fill(email);
    await this.page.locator('input[type="password"]').fill(password);
    await this.page.getByRole('button', { name: /^Sign in$/i }).click();
  }
}
