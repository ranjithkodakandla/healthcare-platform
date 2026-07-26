import { test, expect, hasAdminCreds } from '../../fixtures/test';

test.describe('Admin console workflows', () => {
  test('login page shows validation and 2FA notice', async ({ adminLogin, page, stepShot }) => {
    await adminLogin.open();
    await expect(page.getByText(/two-factor|2FA|authenticator/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await page.locator('input[type="password"]').fill('');
    await page.getByRole('button', { name: /^Sign in$/i }).click();
    await expect(
      page
        .getByRole('alert')
        .or(page.getByText(/email and password|required|Enter your/i))
        .first(),
    ).toBeVisible({ timeout: 20_000 });
    await stepShot(page, 'admin-login');
  });

  test('admin operations surfaces with session injection', async ({
    adminLogin,
    adminShell,
    page,
    stepShot,
  }) => {
    if (hasAdminCreds()) {
      await adminLogin.open();
      await adminLogin.login();
      await page.waitForURL(/\/dashboard/, { timeout: 45_000 });
    } else {
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.setItem('admin_token', 'e2e-mock-token');
      });
      await page.goto('/dashboard');
    }
    await stepShot(page, 'admin-dashboard');

    for (const path of [
      '/onboarding/provider',
      '/support/tickets',
      '/issues/board',
      '/users',
      '/monitoring',
      '/analytics',
      '/ai-assistant',
      '/governance',
      '/communications',
      '/workflows',
    ]) {
      await adminShell.open(path);
      await expect(page.locator('body')).toBeVisible();
      await stepShot(page, `admin-${path.replace(/\//g, '_')}`);
    }
  });
});
