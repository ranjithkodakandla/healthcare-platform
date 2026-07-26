import { expect } from '@playwright/test';
import { BasePage } from '../BasePage';
import { env } from '../../utils/env';

export class AdminLoginPage extends BasePage {
  async open(): Promise<void> {
    await this.goto('/login');
    await expect(this.page.getByRole('heading', { name: /Admin Console/i })).toBeVisible();
  }

  async login(email = env.adminEmail, password = env.adminPassword): Promise<void> {
    await this.page.locator('input[type="email"]').fill(email);
    await this.page.locator('input[type="password"]').fill(password);
    await this.page.getByRole('button', { name: /^Sign in$/i }).click();
  }
}
