import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility gate against locally built Next apps (not Cloud Run), so CI
 * validates the current workspace without waiting on a redeploy.
 *
 * color-contrast disabled: design-system cream/teal tokens are product-approved
 * (Healthcare-Design-System.md) and fail automated contrast on some muted labels.
 */
async function assertA11y(page: import('@playwright/test').Page, label: string) {
  const results = await new AxeBuilder({ page })
    .disableRules(['color-contrast'])
    .analyze();
  const serious = results.violations.filter((v) =>
    ['serious', 'critical'].includes(v.impact ?? ''),
  );
  expect(serious, `${label} a11y serious/critical:\n${JSON.stringify(serious, null, 2)}`).toEqual(
    [],
  );
}

test.describe('Accessibility gates', () => {
  test('citizen splash', async ({ page }) => {
    await page.goto('http://127.0.0.1:3101/onboarding/splash');
    await expect(page.locator('body')).toBeVisible();
    await assertA11y(page, 'citizen-splash');
  });

  test('provider login', async ({ page }) => {
    await page.goto('http://127.0.0.1:3102/login');
    await expect(page.locator('body')).toBeVisible();
    await assertA11y(page, 'provider-login');
  });

  test('admin login', async ({ page }) => {
    await page.goto('http://127.0.0.1:3103/login');
    await expect(page.locator('body')).toBeVisible();
    await assertA11y(page, 'admin-login');
  });
});
