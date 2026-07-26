import { expect } from '@playwright/test';
import { BasePage } from '../BasePage';
import { env } from '../../utils/env';

export class ProviderLoginPage extends BasePage {
  async open(): Promise<void> {
    await this.goto('/login');
    await expect(this.page.getByRole('heading', { name: /Provider Portal/i })).toBeVisible();
  }

  // Org/portal selection is derived from the verified backend session response
  // (Finding #1/#9 fix), not chosen at login — there's no org id field or workplace
  // picker on the form anymore.
  async login(email = env.providerEmail, password = env.providerPassword): Promise<void> {
    await this.page.getByLabel(/Work email/i).fill(email);
    await this.page.locator('input[type="password"]').fill(password);
    await this.page.getByRole('button', { name: /^Sign in$/i }).click();
  }
}
