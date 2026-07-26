import { expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class CitizenTriagePage extends BasePage {
  async open(): Promise<void> {
    await this.goto('/home/triage');
  }

  async answerCriticalPath(): Promise<void> {
    // One-question-at-a-time triage (Session 29+): last answer auto-submits.
    const answers = [
      /No — not responding|not responding/i,
      /Struggling or not breathing/i,
      /Yes — bleeding heavily|bleeding heavily/i,
    ];
    for (const name of answers) {
      const btn = this.page.getByRole('button', { name });
      await expect(btn.first()).toBeVisible({ timeout: 15_000 });
      await btn.first().click();
      await this.page.waitForTimeout(200);
    }
  }

  async submitEmergency(): Promise<void> {
    // Legacy multi-step UI had an explicit submit; current UI auto-submits on last answer.
    const submit = this.page.getByRole('button', { name: /Send Emergency Request|Send request/i });
    if (await submit.count()) {
      await submit.first().click();
    }
  }

  async expectSearchingOrCase(): Promise<void> {
    await this.page.waitForURL(/\/(home\/searching|case\/dashboard)/, { timeout: 45_000 });
  }
}
