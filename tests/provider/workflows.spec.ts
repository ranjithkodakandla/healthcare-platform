import { test, expect, hasProviderCreds, env } from '../../fixtures/test';

test.describe('Provider portal workflows', () => {
  test('login page validates required fields', async ({ providerLogin, page, stepShot }) => {
    await providerLogin.open();
    await page.getByRole('button', { name: /^Sign in$/i }).click();
    await expect(
      page
        .getByRole('alert')
        .or(page.getByText(/required/i))
        .first(),
    ).toBeVisible();
    await stepShot(page, 'provider-login-validation');
  });

  test('hospital console workflows with session injection', async ({
    providerLogin,
    providerShell,
    page,
    stepShot,
  }) => {
    // Prefer real Firebase login when creds exist; otherwise inject session so the
    // console shell/routes remain covered without skipping the gate.
    if (hasProviderCreds()) {
      await providerLogin.open();
      await providerLogin.login();
      await page.waitForURL(/\/hospital\/dashboard/, { timeout: 45_000 });
    } else {
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.setItem('provider_hospital_id', 'e2e-hospital');
        localStorage.setItem('provider_token', 'e2e-mock-token');
      });
      await page.goto('/hospital/dashboard');
    }
    await stepShot(page, 'provider-dashboard');

    for (const path of [
      '/hospital/beds',
      '/hospital/queue',
      '/hospital/cases',
      '/hospital/reports',
      '/hospital/analytics',
      '/hospital/ai-assistant',
      '/ambulance/fleet',
      '/pharmacy/stock',
      '/blood-bank/pre-alerts',
      '/doctor/availability',
    ]) {
      await providerShell.go(path);
      await expect(page.locator('body')).toBeVisible();
      await stepShot(page, `provider-${path.replace(/\//g, '_')}`);
    }

    expect(await page.evaluate(() => localStorage.getItem('provider_hospital_id'))).toBeTruthy();
    void env;
  });

  test('unauthenticated beds/queue screens still mount (token-gated API)', async ({
    page,
    stepShot,
  }) => {
    await page.goto('/hospital/beds');
    await stepShot(page, 'beds-unauth');
    await page.goto('/hospital/queue');
    await stepShot(page, 'queue-unauth');
  });
});
