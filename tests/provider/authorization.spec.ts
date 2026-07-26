import { test, expect } from '../../fixtures/test';

// Regression coverage for PROVIDER_UAT_REPORT.md Finding #1/#9: a Hospital-scoped
// session could previously navigate straight into other portals (e.g. Insurance
// Pre-Auth, Doctor Availability) and see/act on their data, because no route guard
// existed anywhere in the app. PortalGuard (components/shell/PortalGuard.tsx) now
// checks the session's providerType against the portal it's mounted under.
//
// Note: this is UI/defense-in-depth coverage only — the real security boundary is the
// API's OrgScopeGuard, covered separately by
// apps/api/src/shared-services/auth/org-scope.guard.spec.ts.

function injectSession(providerType: string | null) {
  return (pt: string | null) => {
    localStorage.setItem('provider_hospital_id', 'e2e-hospital');
    localStorage.setItem('provider_token', 'e2e-mock-token');
    localStorage.setItem('provider_role', 'PROVIDER_STAFF');
    if (pt) {
      localStorage.setItem('provider_type', pt);
    } else {
      localStorage.removeItem('provider_type');
    }
  };
}

test.describe('Provider portal authorization (Finding #1/#9)', () => {
  test('a HOSPITAL session is denied on the Insurance portal', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(injectSession('HOSPITAL'), 'HOSPITAL');
    await page.goto('/insurance/pre-auth');
    await expect(page.getByText(/Not authorized/i)).toBeVisible();
    await expect(page.getByText(/does not have access to this portal/i)).toBeVisible();
  });

  test('a HOSPITAL session is denied on the Doctor portal', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(injectSession('HOSPITAL'), 'HOSPITAL');
    await page.goto('/doctor/availability');
    await expect(page.getByText(/Not authorized/i)).toBeVisible();
  });

  test('a HOSPITAL session renders normally on its own portal', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(injectSession('HOSPITAL'), 'HOSPITAL');
    await page.goto('/hospital/beds');
    await expect(page.getByText(/Not authorized/i)).not.toBeVisible();
    await expect(page.getByRole('heading', { name: /Bed Inventory Update/i })).toBeVisible();
  });

  test('an unauthenticated visitor is redirected to /login', async ({ page }) => {
    await page.goto('/hospital/dashboard');
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  });

  test('login form no longer exposes a free-text org id or workplace picker (Finding #1 root cause)', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/Organization ID/i)).toHaveCount(0);
    await expect(page.getByRole('radiogroup', { name: /Workplace type/i })).toHaveCount(0);
    await expect(page.getByLabel(/Work email/i)).toBeVisible();
  });
});
