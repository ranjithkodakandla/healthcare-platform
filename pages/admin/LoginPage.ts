import { expect } from '@playwright/test';
import { BasePage } from '../BasePage';
import { env } from '../../utils/env';

export class AdminLoginPage extends BasePage {
  async open(): Promise<void> {
    await this.goto('/login');
    await expect(this.page.getByRole('heading', { name: /Admin Console/i })).toBeVisible();
    // Ensure we are not mid-redirect from a prior 401 clear
    await this.page.waitForLoadState('domcontentloaded');
  }

  async login(email = env.adminEmail, password = env.adminPassword): Promise<void> {
    const emailInput = this.page.getByLabel(/Staff email/i);
    const passwordInput = this.page.getByLabel(/^Password$/i);
    await emailInput.click();
    await emailInput.fill('');
    await emailInput.pressSequentially(email, { delay: 15 });
    await passwordInput.click();
    await passwordInput.fill('');
    await passwordInput.pressSequentially(password, { delay: 15 });
    await this.page.getByRole('button', { name: /^Sign in$/i }).click();
  }
}
