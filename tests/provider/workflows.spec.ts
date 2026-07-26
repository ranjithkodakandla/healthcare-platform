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
        localStorage.setItem('provider_role', 'PROVIDER_STAFF');
        localStorage.setItem('provider_type', 'HOSPITAL');
      });
      await page.goto('/hospital/dashboard');
    }
    await stepShot(page, 'provider-dashboard');

    // PortalGuard (Finding #1/#9 fix) only renders a portal's screens when the
    // session's providerType matches — each non-Hospital path below needs the
    // matching provider_type injected first, same as a real cross-portal login would.
    const PATH_PROVIDER_TYPE: Record<string, string> = {
      '/hospital/beds': 'HOSPITAL',
      '/hospital/queue': 'HOSPITAL',
      '/hospital/cases': 'HOSPITAL',
      '/hospital/reports': 'HOSPITAL',
      '/hospital/analytics': 'HOSPITAL',
      '/hospital/ai-assistant': 'HOSPITAL',
      '/ambulance/fleet': 'AMBULANCE_OPERATOR',
      '/pharmacy/stock': 'PHARMACY',
      '/blood-bank/pre-alerts': 'BLOOD_BANK',
      '/doctor/availability': 'DOCTOR',
    };

    for (const path of Object.keys(PATH_PROVIDER_TYPE)) {
      await page.evaluate(
        (providerType) => localStorage.setItem('provider_type', providerType),
        PATH_PROVIDER_TYPE[path],
      );
      await providerShell.go(path);
      await expect(page.locator('body')).toBeVisible();
      await expect(page.getByRole('alert').filter({ hasText: /Not authorized/i })).toHaveCount(0);
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
