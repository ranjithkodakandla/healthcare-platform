import { test, expect } from '../../fixtures/test';
import { CITIZEN_SCREENS } from '../../utils/routes';

/**
 * Visits every registered Citizen screen and captures a screenshot.
 * Extend utils/routes.ts when new screens land.
 */
test.describe('Citizen screen discovery', () => {
  for (const screen of CITIZEN_SCREENS) {
    test(`${screen.id} ${screen.path} renders`, async ({ page, stepShot }) => {
      const res = await page.goto(screen.path, { waitUntil: 'domcontentloaded' });
      // Soft-fail only on hard 5xx; Next redirects are fine.
      expect(res?.status() ?? 200).toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible();
      if (screen.titleHint) {
        await expect(page.locator('body')).toContainText(screen.titleHint);
      }
      await stepShot(page, `citizen-${screen.id}`);
    });
  }
});
