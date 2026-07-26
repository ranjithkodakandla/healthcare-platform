import { test, expect } from '../../fixtures/test';
import { ADMIN_SCREENS } from '../../utils/routes';

test.describe('Admin screen discovery', () => {
  for (const screen of ADMIN_SCREENS) {
    test(`${screen.id} ${screen.path} renders`, async ({ page, stepShot }) => {
      const res = await page.goto(screen.path, { waitUntil: 'domcontentloaded' });
      expect(res?.status() ?? 200).toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible();
      if (screen.titleHint) {
        await expect(page.locator('body')).toContainText(screen.titleHint);
      }
      await stepShot(page, `admin-${screen.id}`);
    });
  }
});
